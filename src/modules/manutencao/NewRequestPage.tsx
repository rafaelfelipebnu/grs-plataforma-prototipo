import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, PageHeader, Panel, SelectField, TextField, useToast } from '@/components/ui';
import { isModuleAvailable } from '@/access';
import type { Asset, MaintenancePriority } from '@/domain';
import { MODULES } from '@/modules/registry';
import { errorMessage } from '@/modules/central/shared';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { OpenRecordsNotice } from '@/app/integration/LinkedRecords';
import { ErrorState } from '@/components/ui';
import { MaintenanceNav, PRIORITY_OPTIONS, ProvisionalTag, TextArea, maintenancePaths, maintenanceStyles as s } from './shared';

/**
 * Abertura de solicitação (PRD de Manutenção, req. 1): ativo/local quando
 * conhecido, descrição, prioridade percebida e origem. Aberta a partir do
 * painel 360º do ativo, o ativo e o local já vêm preenchidos.
 */
export function NewRequestPage() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const toast = useToast();
  const [sp] = useSearchParams();
  usePageLabel('Nova solicitação');
  const perm = services.maintenance.permissions(access);
  const locationOptions = useLocationOptions(6);

  const assets: Asset[] = useMemo(() => {
    if (!isModuleAvailable(access, 'central')) return [];
    try {
      return services.central.assetOptions(access);
    } catch {
      return [];
    }
  }, [services, access]);

  const fromAsset = assets.find((a) => a.id === sp.get('ativo'));
  const occurrenceParam = sp.get('ocorrencia');
  const fromOccurrence = useMemo(
    () => (occurrenceParam ? services.occurrences.requestPrefill(access, occurrenceParam) : null),
    [occurrenceParam, services, access],
  );
  const eventParam = sp.get('evento');
  const fromEvent = useMemo(
    () => (eventParam && !occurrenceParam ? services.maintenance.eventPrefill(access, eventParam) : null),
    [eventParam, occurrenceParam, services, access],
  );
  const eventAsset = fromEvent?.assetId ? assets.find((a) => a.id === fromEvent.assetId) : undefined;
  const [title, setTitle] = useState(fromOccurrence ? `${fromOccurrence.typeName} — ${fromOccurrence.code}` : (fromEvent?.event.title ?? ''));
  const [description, setDescription] = useState(fromOccurrence?.description ?? (fromEvent ? fromEvent.event.description : ''));
  const [locationId, setLocationId] = useState(fromOccurrence?.locationId ?? fromEvent?.locationId ?? fromAsset?.primaryLocationId ?? '');
  const [assetId, setAssetId] = useState(fromOccurrence?.assetId ?? eventAsset?.id ?? fromAsset?.id ?? '');
  const [priority, setPriority] = useState<MaintenancePriority>('media');
  const [errors, setErrors] = useState<string>();
  const [busy, setBusy] = useState(false);

  const assetChoices = useMemo(() => {
    if (!locationId) return assets;
    return assets.filter((a) => services.locations.pathOf(access, a.primaryLocationId).some((l) => l.id === locationId));
  }, [assets, locationId, services, access]);

  if (!perm.request) {
    return (
      <>
        <PageHeader title="Nova solicitação" breadcrumb={[{ label: MODULES.manutencao.name, to: maintenancePaths.overview }, { label: 'Nova solicitação' }]} />
        <Panel title="Acesso">
          <ErrorState kind={403} text="Seu perfil não abre solicitações de manutenção." />
        </Panel>
      </>
    );
  }

  const submit = async () => {
    setBusy(true);
    setErrors(undefined);
    try {
      const created = await services.maintenance.createRequest(access, {
        title,
        description,
        locationId,
        assetId: assetId || undefined,
        perceivedPriority: priority,
        origin: fromAsset && assetId === fromAsset.id ? 'painel-ativo' : 'manual',
        occurrenceId: fromOccurrence?.id,
        sourceEventId: fromEvent?.event.id,
      });
      toast.show({ tone: 'success', title: `Solicitação ${created.code} aberta`, message: 'A equipe de manutenção foi avisada para a triagem.' });
      navigate(maintenancePaths.request(created.id), { replace: true });
    } catch (e) {
      setErrors(errorMessage(e) ?? 'Não foi possível abrir a solicitação.');
    } finally {
      setBusy(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === assetId);

  return (
    <>
      <ReturnBar />
      <PageHeader
        title="Nova solicitação"
        breadcrumb={[
          { label: MODULES.manutencao.name, to: maintenancePaths.overview },
          { label: 'Solicitações', to: maintenancePaths.requests },
          { label: 'Nova' },
        ]}
        description="Descreva a necessidade. A solicitação ainda não é uma ordem de serviço: a triagem decide o destino."
      />
      <MaintenanceNav />
      <Panel
        title="Dados da solicitação"
        footerStart={
          <Button variant="link" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        }
        footerEnd={
          <Button icon="paper-plane" loading={busy} onClick={submit}>
            Abrir solicitação
          </Button>
        }
      >
        <div className={s.formStack} style={{ maxWidth: 720 }}>
          {fromOccurrence && (
            <Alert tone="info">
              Aberta a partir da ocorrência <strong>{fromOccurrence.code}</strong>. A origem fica registrada nos dois módulos; a solicitação não altera o status da
              ocorrência.
            </Alert>
          )}
          {!fromOccurrence && fromEvent && (
            <Alert tone="info">
              Aberta a partir do evento <ContextLink to={paths.event(fromEvent.event.id)}>{fromEvent.event.code}</ContextLink>. A origem fica registrada na solicitação;
              o status do evento não muda.
            </Alert>
          )}
          {!fromOccurrence && !fromEvent && fromAsset && (
            <Alert tone="info">
              Aberta a partir do painel 360º do ativo <strong>{fromAsset.tag}</strong>. O ativo e o local vêm da Central de Ativos e Ambientes.
            </Alert>
          )}
          <OpenRecordsNotice assetId={selectedAsset?.id} assetTag={selectedAsset?.tag} />
          <TextField label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Vazamento na bomba de recalque" maxLength={120} />
          <TextArea id="sol-desc" label="Descrição" required value={description} onChange={setDescription} placeholder="O que foi observado, desde quando, impacto percebido." />
          <SelectField
            label="Local"
            required
            emptyLabel="Selecione o local"
            options={locationOptions}
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              const current = assets.find((a) => a.id === assetId);
              if (current && !services.locations.pathOf(access, current.primaryLocationId).some((l) => l.id === e.target.value)) setAssetId('');
            }}
            helper="Hierarquia única de localização da Central, restrita ao seu escopo."
          />
          <SelectField
            label="Ativo"
            emptyLabel={assets.length ? 'Não se aplica / não sei' : 'Central indisponível para seu perfil'}
            options={assetChoices.map((a) => ({ value: a.id, label: `${a.tag} — ${a.name}` }))}
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value);
              const asset = assets.find((a) => a.id === e.target.value);
              if (asset && !locationId) setLocationId(asset.primaryLocationId);
            }}
            helper="Opcional: informe quando o ativo for conhecido."
          />
          <div>
            <SelectField label="Prioridade percebida" required options={PRIORITY_OPTIONS} value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} />
            <ProvisionalTag code="P-49">Escala provisória</ProvisionalTag>
          </div>
          {errors && <Alert tone="error">{errors}</Alert>}
        </div>
      </Panel>
    </>
  );
}
