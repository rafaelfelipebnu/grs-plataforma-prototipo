import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, ErrorState, IconButton, PageHeader, Panel, SelectField, Stack, TextField, useToast } from '@/components/ui';
import { CRITICALITY_LABEL, MODULE_IDS, type AssetGroup, type Criticality, type GroupRule, type ModuleId } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { GroupInput } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { useUnsavedChangesGuard } from '@/app/hooks/useUnsavedChangesGuard';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { centralPaths } from './centralPaths';
import { ReasonModal, errorMessage } from './shared';
import styles from './central.module.css';

const CONSUMER_MODULES = MODULE_IDS.filter((m) => m !== 'central');

function toInput(g: AssetGroup): GroupInput {
  return {
    name: g.name,
    description: g.description,
    category: g.category === 'corporativo' ? 'corporativo' : 'operacional',
    scopeLocationId: g.scopeLocationId,
    rules: g.rules.map((r) => ({ ...r })),
    consumers: g.consumers.map((c) => c.moduleId),
    auditPeriodicityDays: g.auditPeriodicityDays,
  };
}

export function NewGroupPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Novo grupo');
  const creatable = services.groups.canCreate(access);
  if (!creatable.corporate && !creatable.local) {
    return (
      <Panel title="Acesso">
        <ErrorState kind={403} text="Seu perfil não pode criar grupos." />
      </Panel>
    );
  }
  const scopeRoot = creatable.corporate ? undefined : services.locations.getTree(access)[0]?.location.id;
  return (
    <GroupForm
      initial={{ name: '', description: '', category: creatable.corporate ? 'corporativo' : 'operacional', scopeLocationId: scopeRoot, rules: [], consumers: [], auditPeriodicityDays: undefined }}
      corporateAllowed={creatable.corporate}
    />
  );
}

export function EditGroupPage() {
  const { groupId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const query = useServiceQuery(() => services.groups.get(access, groupId), [groupId, access]);
  usePageLabel(query.data ? `Editar ${query.data.group.name}` : undefined);
  return (
    <QueryBoundary query={query} moduleId="central">
      {(d) =>
        d.permissions.editConfig ? (
          <GroupForm initial={toInput(d.group)} existing={d.group} corporateAllowed={services.groups.canCreate(access).corporate} />
        ) : (
          <Panel title="Acesso">
            <ErrorState kind={403} text={d.permissions.readOnlyReason ?? 'Você não pode alterar a configuração deste grupo.'} />
          </Panel>
        )
      }
    </QueryBoundary>
  );
}

function GroupForm({ initial, existing, corporateAllowed }: { initial: GroupInput; existing?: AssetGroup; corporateAllowed: boolean }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const locationOptions = useLocationOptions(10);
  const unitOptions = useLocationOptions(0);
  const [form, setForm] = useState<GroupInput>(initial);
  const [error, setError] = useState<string>();
  const [nameError, setNameError] = useState<string>();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const guard = useUnsavedChangesGuard(!saved && JSON.stringify(form) !== JSON.stringify(initial));
  const classifications = services.central.classifications();
  const isLocal = Boolean(form.scopeLocationId);

  const preview = useMemo(() => {
    try {
      return services.groups.preview(access, existing?.id ?? null, { rules: form.rules, scopeLocationId: form.scopeLocationId });
    } catch {
      return undefined;
    }
  }, [services, access, existing, form.rules, form.scopeLocationId]);

  const set = <K extends keyof GroupInput>(key: K, value: GroupInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(undefined);
  };
  const updateRule = (index: number, patch: Partial<GroupRule>) => set('rules', form.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const toggleIn = <T,>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

  const submit = () => {
    if (form.name.trim().length < 3) {
      setNameError('Informe o nome do grupo (mínimo de 3 caracteres).');
      return;
    }
    const empty = form.rules.findIndex((r) => !r.classificationIds?.length && !r.criticalities?.length && !r.locationIds?.length);
    if (empty >= 0) {
      setError(`A regra ${empty + 1} precisa de ao menos um critério (classificação, criticidade ou local).`);
      return;
    }
    setReasonOpen(true);
  };

  const save = async (reason: string) => {
    try {
      const group = existing ? await services.groups.updateConfig(access, existing.id, form, reason) : await services.groups.create(access, form, reason);
      setSaved(true);
      setReasonOpen(false);
      toast.show({
        tone: 'success',
        title: existing ? 'Configuração do grupo atualizada' : 'Grupo criado',
        message: preview ? `${group.name} · ${preview.totalAfter} ativo(s) associado(s).` : group.name,
      });
      setTimeout(() => navigate(centralPaths.group(group.id), { replace: true }), 0);
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  };

  const assetLinks = (list: { id: string; tag: string }[]) =>
    list.length === 0 ? (
      <span className="muted">nenhum</span>
    ) : (
      list.map((a, i) => (
        <span key={a.id}>
          {i > 0 && ', '}
          <ContextLink to={paths.asset(a.id)}>{a.tag}</ContextLink>
        </span>
      ))
    );

  return (
    <>
      <PageHeader
        title={existing ? `Editar ${existing.name}` : 'Novo grupo'}
        breadcrumb={[
          { label: MODULES.central.name, to: '/central' },
          { label: 'Grupos', to: centralPaths.home({ aba: 'grupos' }) },
          ...(existing ? [{ label: existing.name, to: centralPaths.group(existing.id) }] : []),
          { label: existing ? 'Editar' : 'Novo grupo' },
        ]}
        description="Grupos dizem por que ou como os ativos são usados. A associação pode ser manual ou por regras reavaliadas dinamicamente."
      />
      <Stack>
        {error && <Alert tone="error" title="Não foi possível salvar">{error}</Alert>}
        <Panel title="Identificação">
          <div className={styles.formGrid}>
            <TextField
              label="Nome"
              required
              value={form.name}
              error={nameError}
              onChange={(e) => {
                set('name', e.target.value);
                setNameError(undefined);
              }}
            />
            {!existing ? (
              <SelectField
                label="Abrangência"
                required
                value={isLocal ? 'local' : 'empresa'}
                onChange={(e) =>
                  setForm((f) =>
                    e.target.value === 'local'
                      ? { ...f, scopeLocationId: unitOptions[0]?.value, category: 'operacional' }
                      : { ...f, scopeLocationId: undefined },
                  )
                }
                options={[
                  { value: 'empresa', label: 'Compartilhado — toda a empresa (corporativo)', disabled: !corporateAllowed },
                  { value: 'local', label: 'Local — restrito a uma unidade' },
                ]}
                helper={corporateAllowed ? undefined : 'Grupos para toda a empresa são definidos pelo corporativo.'}
              />
            ) : (
              <TextField label="Abrangência" value={isLocal ? 'Grupo local' : 'Toda a empresa'} readOnly disabled />
            )}
            {isLocal ? (
              <SelectField
                label="Unidade do grupo local"
                required
                value={form.scopeLocationId ?? ''}
                disabled={Boolean(existing)}
                onChange={(e) => set('scopeLocationId', e.target.value)}
                options={existing ? locationOptions : unitOptions}
                helper="Regras e associações ficam restritas a esta localização."
              />
            ) : (
              <SelectField
                label="Categoria"
                required
                value={form.category}
                onChange={(e) => set('category', e.target.value as GroupInput['category'])}
                options={[
                  { value: 'corporativo', label: 'Corporativo compartilhado' },
                  { value: 'operacional', label: 'Operacional compartilhado' },
                ]}
              />
            )}
            <TextField
              label="Periodicidade mínima de auditoria (dias)"
              type="number"
              min={1}
              max={730}
              value={form.auditPeriodicityDays ?? ''}
              onChange={(e) => set('auditPeriodicityDays', e.target.value ? Number(e.target.value) : undefined)}
              helper="Vazio = sem auditoria periódica."
            />
            <div className={styles.formGridFull}>
              <label htmlFor="group-description" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Descrição
              </label>
              <textarea id="group-description" className={styles.textarea} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Regras de associação automática"
          actions={
            <Button size="small" icon="plus" variant="secondary" onClick={() => set('rules', [...form.rules, { id: '', description: `Regra ${form.rules.length + 1}` }])}>
              Adicionar regra
            </Button>
          }
        >
          <p className="helper" style={{ marginBottom: 12 }}>
            Todos os critérios de uma regra precisam ser atendidos; regras diferentes se somam. Classificações e locais incluem descendentes. Inclusões
            manuais e exceções existentes são preservadas.
          </p>
          {form.rules.length === 0 ? (
            <p className="muted">Sem regras: o grupo terá somente associações manuais.</p>
          ) : (
            <Stack>
              {form.rules.map((rule, index) => (
                <div key={index} className={styles.ruleCard}>
                  <div className={styles.ruleHeader}>
                    <TextField label={`Descrição da regra ${index + 1}`} value={rule.description} onChange={(e) => updateRule(index, { description: e.target.value })} />
                    <IconButton icon="trash" label={`Remover regra ${index + 1}`} onClick={() => set('rules', form.rules.filter((_, i) => i !== index))} />
                  </div>
                  <fieldset className={styles.fieldset}>
                    <legend>Classificações</legend>
                    <div className={styles.checkGroup} style={{ maxHeight: 160 }}>
                      {classifications.map((c) => (
                        <Checkbox
                          key={c.id}
                          label={c.parentId ? `— ${c.name}` : c.name}
                          checked={rule.classificationIds?.includes(c.id) ?? false}
                          onChange={() => updateRule(index, { classificationIds: toggleIn(rule.classificationIds, c.id) })}
                        />
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={styles.fieldset}>
                    <legend>Criticidade</legend>
                    <div className={styles.inlineActions}>
                      {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => (
                        <Checkbox
                          key={c}
                          label={CRITICALITY_LABEL[c]}
                          checked={rule.criticalities?.includes(c) ?? false}
                          onChange={() => updateRule(index, { criticalities: toggleIn(rule.criticalities, c) })}
                        />
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={styles.fieldset}>
                    <legend>Locais</legend>
                    <div className={styles.checkGroup} style={{ maxHeight: 160 }}>
                      {locationOptions.map((o) => (
                        <Checkbox
                          key={o.value}
                          label={o.label}
                          checked={rule.locationIds?.includes(o.value) ?? false}
                          onChange={() => updateRule(index, { locationIds: toggleIn(rule.locationIds, o.value) })}
                        />
                      ))}
                    </div>
                  </fieldset>
                </div>
              ))}
            </Stack>
          )}
        </Panel>

        <Panel title="Prévia dos ativos afetados">
          {!preview ? (
            <p className="muted">Ajuste as regras para ver a prévia.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <p>
                Após salvar, o grupo terá <strong>{preview.totalAfter}</strong> ativo(s) associado(s).
              </p>
              <div>
                <strong>Entram ({preview.added.length}):</strong> {assetLinks(preview.added)}
              </div>
              <div>
                <strong>Saem ({preview.removed.length}):</strong> {assetLinks(preview.removed)}
              </div>
              {preview.keptOutByException.length > 0 && (
                <Alert tone="warning" title="Conflitos com exceções">
                  As regras incluiriam {assetLinks(preview.keptOutByException)}, mas há exceção registrada. Eles continuam fora do grupo até a exceção ser
                  removida.
                </Alert>
              )}
              {preview.keptByManual.length > 0 && (
                <p className="helper">Permanecem por inclusão manual: {assetLinks(preview.keptByManual)}.</p>
              )}
            </div>
          )}
        </Panel>

        {!isLocal && (
          <Panel title="Módulos consumidores">
            <p className="helper" style={{ marginBottom: 8 }}>
              Módulos autorizados a usar este grupo. Autorizar não dispara nenhuma ação: cada módulo configura a própria reação (informativa, aplicar
              configuração ou gatilho operacional).
            </p>
            <div className={styles.inlineActions}>
              {CONSUMER_MODULES.map((m: ModuleId) => (
                <Checkbox key={m} label={MODULES[m].name} checked={form.consumers.includes(m)} onChange={() => set('consumers', toggleIn(form.consumers, m))} />
              ))}
            </div>
          </Panel>
        )}

        <div className={styles.inlineActions} style={{ justifyContent: 'flex-end' }}>
          <Button variant="link" onClick={() => navigate(existing ? centralPaths.group(existing.id) : centralPaths.home({ aba: 'grupos' }))}>
            Cancelar
          </Button>
          <Button icon="check" onClick={submit}>
            {existing ? 'Salvar configuração' : 'Criar grupo'}
          </Button>
        </div>
      </Stack>
      <ReasonModal
        open={reasonOpen}
        title={existing ? 'Confirmar alteração do grupo' : 'Confirmar criação do grupo'}
        confirmLabel={existing ? 'Salvar configuração' : 'Criar grupo'}
        onCancel={() => setReasonOpen(false)}
        onConfirm={save}
      >
        {preview && (
          <p className="helper">
            {preview.added.length} ativo(s) entram e {preview.removed.length} saem do grupo. A mudança fica registrada na auditoria de configuração e as
            associações resultantes na auditoria de associação.
          </p>
        )}
      </ReasonModal>
      {guard}
    </>
  );
}
