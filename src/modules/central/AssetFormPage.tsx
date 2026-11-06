import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { can } from '@/access';
import { Alert, Button, Checkbox, ErrorState, PageHeader, Panel, SelectField, Stack, TextField, useToast } from '@/components/ui';
import { CRITICALITY_LABEL, type Asset, type Criticality } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { AssetInput } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { useUnsavedChangesGuard } from '@/app/hooks/useUnsavedChangesGuard';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { centralPaths } from './centralPaths';
import { ReasonModal, errorMessage, normalizeText } from './shared';
import styles from './central.module.css';

const EMPTY: AssetInput = {
  tag: '',
  name: '',
  description: '',
  classificationId: '',
  primaryLocationId: '',
  servedLocationIds: [],
  criticality: 'media',
  directResponsiblePersonId: undefined,
  dependsOnAssetIds: [],
};

function toInput(a: Asset): AssetInput {
  return {
    tag: a.tag,
    name: a.name,
    description: a.description,
    classificationId: a.classificationId,
    primaryLocationId: a.primaryLocationId,
    servedLocationIds: [...a.servedLocationIds],
    criticality: a.criticality,
    directResponsiblePersonId: a.directResponsiblePersonId,
    dependsOnAssetIds: a.relationships.filter((r) => r.type === 'depende-de').map((r) => r.targetAssetId),
  };
}

/** Cadastro de ativo na Central (novo). */
export function NewAssetPage() {
  const [sp] = useSearchParams();
  usePageLabel('Novo ativo');
  return <AssetForm initial={{ ...EMPTY, primaryLocationId: sp.get('local') ?? '' }} />;
}

/** Edição do cadastro mestre do ativo. */
export function EditAssetPage() {
  const { assetId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.assets.get(access, assetId), [assetId, access]);
  usePageLabel(query.data ? `Editar ${query.data.asset.tag}` : undefined);
  return (
    <QueryBoundary query={query} moduleId="central">
      {(s) => <AssetForm initial={toInput(s.asset)} existing={s.asset} />}
    </QueryBoundary>
  );
}

type Errors = Partial<Record<keyof AssetInput, string>>;

function AssetForm({ initial, existing }: { initial: AssetInput; existing?: Asset }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const locationOptions = useLocationOptions(10);
  const [form, setForm] = useState<AssetInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notDuplicate, setNotDuplicate] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [depFilter, setDepFilter] = useState('');

  const dirty = !saved && JSON.stringify(form) !== JSON.stringify(initial);
  const guard = useUnsavedChangesGuard(dirty);

  const classifications = services.central.classifications();
  const people = useMemo(() => services.central.assignablePeople(access), [services, access]);
  const assetOptions = useMemo(() => services.central.assetOptions(access).filter((a) => a.id !== existing?.id), [services, access, existing]);

  const duplicates = useMemo(
    () => services.central.checkDuplicates(access, { tag: form.tag, name: form.name, primaryLocationId: form.primaryLocationId }, existing?.id),
    [services, access, form.tag, form.name, form.primaryLocationId, existing],
  );
  useEffect(() => setNotDuplicate(false), [duplicates.similar.length]);

  if (!can(access, 'central.manage')) {
    return (
      <Panel title="Acesso">
        <ErrorState kind={403} text="Seu perfil não pode alterar o cadastro da Central." />
      </Panel>
    );
  }

  const set = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(undefined);
  };
  const toggle = (key: 'servedLocationIds' | 'dependsOnAssetIds', id: string) =>
    set(key, form[key].includes(id) ? form[key].filter((x) => x !== id) : [...form[key], id]);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.tag.trim()) e.tag = 'Informe a tag.';
    else if (duplicates.tagConflict) e.tag = `Tag já usada por ${duplicates.tagConflict.tag} · ${duplicates.tagConflict.name}.`;
    else if (duplicates.tagTakenOutOfScope) e.tag = 'Tag já em uso por um ativo fora do seu escopo.';
    if (!form.name.trim()) e.name = 'Informe o nome.';
    if (!form.classificationId) e.classificationId = 'Selecione a classificação.';
    if (!form.primaryLocationId) e.primaryLocationId = 'A localização principal é obrigatória.';
    if (form.servedLocationIds.includes(form.primaryLocationId)) e.servedLocationIds = 'A localização principal não precisa ser marcada como local atendido.';
    setErrors(e);
    if (Object.keys(e).length) return false;
    if (duplicates.similar.length > 0 && !notDuplicate) {
      setSubmitError('Confirme que o ativo não é duplicidade dos ativos semelhantes encontrados.');
      return false;
    }
    return true;
  };

  const save = async (reason?: string) => {
    setBusy(true);
    try {
      const asset = existing ? await services.central.updateAsset(access, existing.id, form, reason ?? '') : await services.central.createAsset(access, form);
      setSaved(true);
      toast.show({ tone: 'success', title: existing ? 'Cadastro atualizado' : 'Ativo cadastrado', message: `${asset.tag} · ${asset.name}` });
      // Aguarda o guard ser liberado antes de navegar.
      setTimeout(() => navigate(paths.asset(asset.id), { replace: true }), 0);
    } catch (error) {
      setSubmitError(errorMessage(error) ?? 'Não foi possível salvar.');
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    if (!validate()) return;
    if (existing) setReasonOpen(true);
    else await save().catch(() => undefined);
  };

  const openExisting = async (asset: Asset) => {
    await services.central.registerDuplicateAvoided(access, `Cadastro de ${form.tag || form.name} interrompido: ativo existente ${asset.tag} aberto.`);
    setSaved(true);
    toast.show({ tone: 'info', title: 'Duplicidade evitada', message: `Abrindo o cadastro existente ${asset.tag}.` });
    setTimeout(() => navigate(paths.asset(asset.id)), 0);
  };

  const cancel = () => navigate(existing ? paths.asset(existing.id) : centralPaths.home({ aba: 'ativos' }));
  const shownDeps = assetOptions.filter((a) => form.dependsOnAssetIds.includes(a.id) || !depFilter || normalizeText(`${a.tag} ${a.name}`).includes(normalizeText(depFilter)));

  return (
    <>
      <PageHeader
        title={existing ? `Editar ${existing.tag}` : 'Novo ativo'}
        breadcrumb={[
          { label: MODULES.central.name, to: '/central' },
          ...(existing ? [{ label: existing.tag, to: paths.asset(existing.id) }] : []),
          { label: existing ? 'Editar' : 'Novo ativo' },
        ]}
        description="Identidade mestre compartilhada por todos os módulos. Atributos especialistas permanecem nos módulos responsáveis."
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <Stack>
          {submitError && <Alert tone="error" title="Não foi possível salvar">{submitError}</Alert>}
          {(duplicates.tagConflict || duplicates.similar.length > 0) && (
            <Alert tone="warning" title={duplicates.tagConflict ? 'Esta tag já está cadastrada' : 'Possível duplicidade'}>
              <p>
                {duplicates.tagConflict
                  ? 'A tag identifica o ativo de forma única. Abra o cadastro existente em vez de criar outro.'
                  : 'Há ativos com nome semelhante na mesma localização. Verifique antes de continuar.'}
              </p>
              <ul className={styles.previewList}>
                {[...(duplicates.tagConflict ? [duplicates.tagConflict] : []), ...duplicates.similar].map((a) => (
                  <li key={a.id}>
                    {a.tag} · {a.name}{' '}
                    <Button variant="link" size="small" onClick={() => openExisting(a)}>
                      Abrir cadastro existente
                    </Button>
                  </li>
                ))}
              </ul>
              {!duplicates.tagConflict && (
                <Checkbox label="Confirmo que não é o mesmo ativo" checked={notDuplicate} onChange={(e) => setNotDuplicate(e.target.checked)} />
              )}
            </Alert>
          )}
          <Panel title="Identificação">
            <div className={styles.formGrid}>
              <TextField label="Tag" required value={form.tag} error={errors.tag} helper="Identificador único do ativo." onChange={(e) => set('tag', e.target.value)} maxLength={30} />
              <TextField label="Nome" required value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
              <SelectField
                label="Classificação"
                required
                emptyLabel="Selecione"
                error={errors.classificationId}
                helper="O que o ativo é (uma classificação principal)."
                value={form.classificationId}
                onChange={(e) => set('classificationId', e.target.value)}
                options={classifications.map((c) => {
                  const parent = classifications.find((p) => p.id === c.parentId);
                  return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
                })}
              />
              <SelectField
                label="Criticidade intrínseca"
                required
                helper="Importância própria do ativo — não é a condição atual nem o impacto."
                value={form.criticality}
                onChange={(e) => set('criticality', e.target.value as Criticality)}
                options={(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => ({ value: c, label: CRITICALITY_LABEL[c] }))}
              />
              <div className={styles.formGridFull}>
                <label htmlFor="asset-description" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Descrição
                </label>
                <textarea id="asset-description" className={styles.textarea} value={form.description} maxLength={500} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>
          </Panel>
          <Panel title="Localização e responsabilidade">
            <div className={styles.formGrid}>
              <SelectField
                label="Localização principal"
                required
                emptyLabel="Selecione"
                error={errors.primaryLocationId}
                helper="Onde o ativo está."
                value={form.primaryLocationId}
                onChange={(e) => set('primaryLocationId', e.target.value)}
                options={locationOptions}
              />
              <SelectField
                label="Responsável direto"
                emptyLabel="Herdar da localização"
                helper="Sem responsável direto, o ativo herda o responsável da localização."
                value={form.directResponsiblePersonId ?? ''}
                onChange={(e) => set('directResponsiblePersonId', e.target.value || undefined)}
                options={people.map((p) => ({ value: p.id, label: `${p.name} — ${p.jobTitle}` }))}
              />
              <fieldset className={`${styles.fieldset} ${styles.formGridFull}`}>
                <legend>Locais atendidos</legend>
                <p className="helper" style={{ marginBottom: 6 }}>
                  Onde o ativo presta serviço ou produz impacto (ex.: gerador que atende vários prédios).
                </p>
                <div className={styles.checkGroup}>
                  {locationOptions.map((o) => (
                    <Checkbox key={o.value} label={o.label} checked={form.servedLocationIds.includes(o.value)} onChange={() => toggle('servedLocationIds', o.value)} />
                  ))}
                </div>
                {errors.servedLocationIds && <span style={{ color: 'var(--sds-red)', fontSize: 12 }}>{errors.servedLocationIds}</span>}
              </fieldset>
            </div>
          </Panel>
          <Panel title="Relacionamentos">
            <fieldset className={styles.fieldset}>
              <legend>Depende de</legend>
              <p className="helper" style={{ marginBottom: 6 }}>
                Ativos necessários para este operar. Base do impacto operacional.
              </p>
              <input
                type="search"
                className={styles.treeFilter}
                placeholder="Filtrar ativos"
                aria-label="Filtrar ativos para dependência"
                value={depFilter}
                onChange={(e) => setDepFilter(e.target.value)}
                style={{ maxWidth: 320, marginBottom: 8 }}
              />
              <div className={styles.checkGroup}>
                {shownDeps.length === 0 ? (
                  <span className="helper">Nenhum ativo encontrado.</span>
                ) : (
                  shownDeps.map((a) => (
                    <Checkbox key={a.id} label={`${a.tag} · ${a.name}`} checked={form.dependsOnAssetIds.includes(a.id)} onChange={() => toggle('dependsOnAssetIds', a.id)} />
                  ))
                )}
              </div>
            </fieldset>
          </Panel>
          <div className={styles.inlineActions} style={{ justifyContent: 'flex-end' }}>
            <Button variant="link" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" icon="check" loading={busy && !reasonOpen}>
              {existing ? 'Salvar alterações' : 'Cadastrar ativo'}
            </Button>
          </div>
        </Stack>
      </form>
      <ReasonModal
        open={reasonOpen}
        title="Motivo da alteração"
        confirmLabel="Salvar alterações"
        onCancel={() => setReasonOpen(false)}
        onConfirm={async (reason) => {
          await save(reason);
          setReasonOpen(false);
        }}
      >
        <p className="helper">A alteração do cadastro mestre reflete em todos os módulos que usam este ativo.</p>
      </ReasonModal>
      {guard}
    </>
  );
}
