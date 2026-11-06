import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isModuleAvailable } from '@/access';
import { Alert, Button, ErrorState, PageHeader, Panel, SelectField, TextField, useToast } from '@/components/ui';
import { OCCURRENCE_PRIORITIES, OCCURRENCE_PRIORITY_LABEL, type Asset, type OccurrencePriority, type Person } from '@/domain';
import { MODULES } from '@/modules/registry';
import { errorMessage } from '@/modules/central/shared';
import { ProvisionalTag, TextArea } from '@/modules/manutencao/shared';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { OccurrenceNav, occurrencePaths, occurrenceStyles as s } from './shared';

/** "yyyy-MM-ddTHH:mm" no fuso local, para o campo datetime-local. */
function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Registro de ocorrência (existente): tipo, local físico, descrição, data e
 * horário, prioridade sugerida pela prioridade padrão do tipo e pessoas
 * envolvidas. A partir de um evento do Security Hub, a origem é preservada.
 */
export function NewOccurrencePage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const toast = useToast();
  const [sp] = useSearchParams();
  usePageLabel('Registrar ocorrência');
  const perm = services.occurrences.permissions(access);
  const types = services.occurrences.types(access);
  const locationOptions = useLocationOptions(6);
  const eventId = sp.get('evento');
  const prefill = useMemo(() => (eventId ? services.occurrences.eventPrefill(access, eventId) : null), [eventId, services, access]);

  const assets: Asset[] = useMemo(() => (isModuleAvailable(access, 'central') ? services.central.assetOptions(access) : []), [services, access]);
  const people: Person[] = useMemo(() => (isModuleAvailable(access, 'central') ? services.central.assignablePeople(access) : []), [services, access]);

  const [typeId, setTypeId] = useState('');
  const [priority, setPriority] = useState<OccurrencePriority>('media');
  const [prioritySuggested, setPrioritySuggested] = useState(true);
  const [locationId, setLocationId] = useState(prefill?.locationId ?? '');
  const [assetId, setAssetId] = useState(prefill?.assetId ?? '');
  const [description, setDescription] = useState(prefill ? `${prefill.event.title}. ${prefill.event.description}` : '');
  const [occurredAt, setOccurredAt] = useState(localInputValue(prefill ? new Date(prefill.event.occurredAt) : new Date()));
  const [involved, setInvolved] = useState<string[]>([]);
  const [personToAdd, setPersonToAdd] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!perm.register) {
    return (
      <>
        <PageHeader title="Registrar ocorrência" breadcrumb={[{ label: MODULES.ocorrencias.name, to: occurrencePaths.panel }, { label: 'Registrar' }]} />
        <Panel title="Acesso">
          <ErrorState kind={403} text="Seu perfil não registra ocorrências." />
        </Panel>
      </>
    );
  }

  const assetChoices = locationId ? assets.filter((a) => services.locations.pathOf(access, a.primaryLocationId).some((l) => l.id === locationId)) : assets;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const created = await services.occurrences.register(access, {
        typeId,
        locationId,
        assetId: assetId || undefined,
        description,
        occurredAt: new Date(occurredAt).toISOString(),
        priority,
        involvedPersonIds: involved,
        sourceEventId: prefill?.event.id,
      });
      toast.show({ tone: 'success', title: `Ocorrência ${created.code} registrada`, message: 'Status: Sem tratamento até o primeiro trâmite.' });
      navigate(occurrencePaths.detail(created.id), { replace: true });
    } catch (e) {
      setError(errorMessage(e) ?? 'Não foi possível registrar a ocorrência.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Registrar ocorrência"
        breadcrumb={[{ label: MODULES.ocorrencias.name, to: occurrencePaths.panel }, { label: 'Registrar' }]}
        description="Evento fora da operação padrão que causa, ou pode causar, queda na qualidade do serviço ou risco a pessoas ou ao edifício."
      />
      <OccurrenceNav />
      <Panel
        title="Dados da ocorrência"
        footerStart={
          <Button variant="link" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        }
        footerEnd={
          <Button icon="save" loading={busy} onClick={submit}>
            Salvar
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
          {prefill && (
            <Alert tone="info">
              Registrada a partir do evento <ContextLink to={paths.event(prefill.event.id)}>{prefill.event.code}</ContextLink>. A origem fica preservada; o status do
              evento não muda.
            </Alert>
          )}
          <SelectField
            label="Tipo de ocorrência"
            required
            emptyLabel="Selecione o tipo"
            options={types.map((t) => ({ value: t.id, label: t.name }))}
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              const type = types.find((t) => t.id === e.target.value);
              if (type && prioritySuggested) setPriority(type.defaultPriority);
            }}
          />
          <SelectField label="Local físico" required emptyLabel="Selecione o local" options={locationOptions} value={locationId} onChange={(e) => setLocationId(e.target.value)} />
          <SelectField
            label="Ativo relacionado"
            emptyLabel="Não se aplica"
            options={assetChoices.map((a) => ({ value: a.id, label: `${a.tag} — ${a.name}` }))}
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            helper="Opcional. Identidade do ativo da Central de Ativos e Ambientes."
          />
          <ProvisionalTag code="P-64">Campo provisório (evolução GRS)</ProvisionalTag>
          <TextArea id="oc-desc" label="Descrição" required value={description} onChange={setDescription} />
          <TextField label="Data e horário da ocorrência" type="datetime-local" required value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          <SelectField
            label="Prioridade"
            required
            options={OCCURRENCE_PRIORITIES.map((p) => ({ value: p, label: OCCURRENCE_PRIORITY_LABEL[p] }))}
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as OccurrencePriority);
              setPrioritySuggested(false);
            }}
            helper="Sugerida pela prioridade padrão do tipo; você pode alterar."
          />
          <div>
            <span style={{ fontWeight: 600 }}>Pessoas envolvidas</span>
            <div className={s.actionsBar} style={{ marginTop: 4 }}>
              <select aria-label="Pessoa envolvida" value={personToAdd} onChange={(e) => setPersonToAdd(e.target.value)} style={{ minHeight: 32, minWidth: 260 }}>
                <option value="">Selecione uma pessoa</option>
                {people
                  .filter((p) => !involved.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.jobTitle}
                    </option>
                  ))}
              </select>
              <Button
                size="small"
                variant="secondary"
                icon="plus"
                disabled={!personToAdd}
                onClick={() => {
                  setInvolved((list) => [...list, personToAdd]);
                  setPersonToAdd('');
                }}
              >
                Adicionar
              </Button>
            </div>
            {involved.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {involved.map((id) => (
                  <li key={id}>
                    {people.find((p) => p.id === id)?.name}{' '}
                    <Button size="small" variant="link" onClick={() => setInvolved((list) => list.filter((x) => x !== id))}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <span className="helper">Opcional. Pessoas da fonte integrada (Controle de Acesso, simulado).</span>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Panel>
    </>
  );
}
