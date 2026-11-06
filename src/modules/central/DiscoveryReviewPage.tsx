import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Modal, PageHeader, Panel, SelectField, Stack, TextField, useToast } from '@/components/ui';
import { DeviceLocationBadge, LocationPath, formatDateTime, formatValue } from '@/components/domain';
import { CRITICALITY_LABEL, type Criticality } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { ReviewAssociation, ReviewItem, ReviewRef } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { centralPaths } from './centralPaths';
import { MIN_REASON, ReasonModal, errorMessage } from './shared';
import styles from './central.module.css';

const refOf = (item: ReviewItem): ReviewRef => (item.kind === 'candidato' ? { kind: 'candidato', id: item.candidate.id } : { kind: 'dispositivo', id: item.device.id });
const nameOf = (item: ReviewItem) => (item.kind === 'candidato' ? item.candidate.name : item.device.name);

/**
 * Revisão humana da descoberta (Central). A descoberta só sugere; aqui uma
 * pessoa autorizada confirma a localização física, decide a associação a um
 * ativo (existente, novo ou nenhum) ou rejeita.
 */
export function DiscoveryReviewPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Revisão de dispositivos descobertos');
  const query = useServiceQuery(() => services.discovery.pending(access), [access]);
  const canReview = services.discovery.canReview(access);
  const [reviewing, setReviewing] = useState<ReviewItem | null>(null);
  const [rejecting, setRejecting] = useState<ReviewItem | null>(null);
  const toast = useToast();

  return (
    <>
      <ReturnBar />
      <PageHeader
        title="Revisão de dispositivos descobertos"
        breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Dispositivos', to: centralPaths.home({ aba: 'dispositivos' }) }, { label: 'Revisão' }]}
        description="A descoberta não confirma a localização física nem cria ou associa ativos. Cada item precisa da sua aprovação."
      />
      <QueryBoundary query={query} moduleId="central">
        {(items) => (
          <Stack>
            {!canReview && <Alert tone="info">Seu perfil pode consultar os itens pendentes, mas não aprová-los.</Alert>}
            {items.length === 0 ? (
              <Panel title="Pendências">
                <EmptyState icon="check-circle" title="Nenhum dispositivo aguardando revisão." text="Novas descobertas são executadas pelos conectores do Monitor de Infraestrutura." />
              </Panel>
            ) : (
              items.map((item) => (
                <ReviewCard
                  key={`${item.kind}-${refOf(item).id}`}
                  item={item}
                  canReview={canReview}
                  onApprove={() => setReviewing(item)}
                  onReject={() => setRejecting(item)}
                />
              ))
            )}
          </Stack>
        )}
      </QueryBoundary>
      {reviewing && <ApproveModal item={reviewing} onClose={() => setReviewing(null)} />}
      <ReasonModal
        open={rejecting !== null}
        title={rejecting?.kind === 'candidato' ? 'Rejeitar dispositivo descoberto' : 'Rejeitar sugestão de localização'}
        confirmLabel="Rejeitar"
        destructive
        onCancel={() => setRejecting(null)}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          await services.discovery.reject(access, refOf(rejecting), reason);
          toast.show({
            tone: 'success',
            title: rejecting.kind === 'candidato' ? 'Dispositivo rejeitado' : 'Sugestão rejeitada',
            message: rejecting.kind === 'candidato' ? `${nameOf(rejecting)} não será incorporado.` : `${nameOf(rejecting)} fica com localização não identificada.`,
          });
          setRejecting(null);
        }}
      >
        <p className="helper">
          {rejecting?.kind === 'candidato'
            ? 'O dispositivo não será criado na Central e não aparecerá de novo em descobertas futuras.'
            : 'O dispositivo continua cadastrado, com localização não identificada, até alguém confirmar onde ele está.'}
        </p>
      </ReasonModal>
    </>
  );
}

function ReviewCard({ item, canReview, onApprove, onReject }: { item: ReviewItem; canReview: boolean; onApprove: () => void; onReject: () => void }) {
  const isCandidate = item.kind === 'candidato';
  const reasons = isCandidate ? item.candidate.suggestions.reasons : [];
  const rejectable = isCandidate || item.device.locationStatus === 'sugerida';
  return (
    <Panel
      title={nameOf(item)}
      footerEnd={
        canReview ? (
          <>
            {rejectable && (
              <Button variant="link" onClick={onReject}>
                Rejeitar
              </Button>
            )}
            <Button icon="check" onClick={onApprove}>
              Revisar e aprovar
            </Button>
          </>
        ) : undefined
      }
    >
      <div className={styles.split}>
        <div>
          <div className={styles.badges} style={{ marginBottom: 8 }}>
            {isCandidate ? <Badge tone="blue">Novo na descoberta</Badge> : <DeviceLocationBadge value={item.device.locationStatus} />}
            <Badge tone="gray">Simulado</Badge>
          </div>
          {isCandidate ? (
            <>
              <p>
                {item.candidate.deviceType} · {item.candidate.manufacturer} {item.candidate.model}
              </p>
              <p className="helper">
                {item.candidate.address} · {item.connector.name} · descoberto em {formatDateTime(item.candidate.discoveredAt)}
              </p>
              <p className="helper">
                {Object.entries(item.candidate.metadata)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
              <p className="helper" style={{ marginTop: 8 }}>
                Pontos de dado: {item.candidate.points.map((p) => `${p.name} (${formatValue(p.value, p.unit)})`).join(', ')}
              </p>
            </>
          ) : (
            <>
              <p>
                {item.device.deviceType} · {item.device.manufacturer} {item.device.model}
              </p>
              <p className="helper">
                {item.connector?.name} ·{' '}
                <ContextLink to={paths.device(item.device.id)}>ver dispositivo</ContextLink>
              </p>
            </>
          )}
        </div>
        <div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Sugestões</p>
          <p className="helper">
            Localização: {item.suggestedLocationPath.length ? <LocationPath path={item.suggestedLocationPath} tail={3} icon={false} /> : 'não identificada'}
          </p>
          {isCandidate && (
            <>
              <p className="helper">Classificação: {item.suggestedClassification?.name ?? '—'}</p>
              <p className="helper">Ativo: {item.suggestedAsset ? `${item.suggestedAsset.tag} · ${item.suggestedAsset.name}` : '—'}</p>
              <ul className={styles.previewList}>
                {reasons.map((r) => (
                  <li key={r} className="helper">
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

type AssocKind = ReviewAssociation['kind'];

function ApproveModal({ item, onClose }: { item: ReviewItem; onClose: () => void }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const locationOptions = useLocationOptions(10);
  const assets = useMemo(() => services.central.assetOptions(access), [services, access]);
  const classifications = services.central.classifications();
  const isCandidate = item.kind === 'candidato';
  const suggestedLocation = isCandidate ? item.candidate.suggestions.locationId : item.device.suggestedLocationId;
  const suggestedAsset = isCandidate ? item.suggestedAsset : undefined;

  const [deviceName, setDeviceName] = useState(nameOf(item));
  const [locationId, setLocationId] = useState(suggestedLocation ?? '');
  const [assoc, setAssoc] = useState<AssocKind>(suggestedAsset ? 'existente' : 'nenhuma');
  const [assetId, setAssetId] = useState(suggestedAsset?.id ?? '');
  const [newAsset, setNewAsset] = useState({
    tag: '',
    name: isCandidate ? item.candidate.name : item.device.name,
    classificationId: isCandidate ? item.candidate.suggestions.classificationId ?? '' : '',
    criticality: 'media' as Criticality,
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setError(undefined), [deviceName, locationId, assoc, assetId, newAsset, reason]);

  const approve = async () => {
    if (!locationId) return setError('Confirme a localização física do dispositivo.');
    if (assoc === 'existente' && !assetId) return setError('Selecione o ativo a associar.');
    if (assoc === 'novo' && (!newAsset.tag.trim() || !newAsset.name.trim() || !newAsset.classificationId)) return setError('Informe tag, nome e classificação do novo ativo.');
    if (reason.trim().length < MIN_REASON) return setError(`Informe o motivo da aprovação (mínimo de ${MIN_REASON} caracteres).`);
    const association: ReviewAssociation =
      assoc === 'existente'
        ? { kind: 'existente', assetId }
        : assoc === 'novo'
          ? {
              kind: 'novo',
              asset: { ...newAsset, description: 'Criado na aprovação de dispositivo descoberto.', primaryLocationId: locationId, servedLocationIds: [], dependsOnAssetIds: [] },
            }
          : { kind: 'nenhuma' };
    setBusy(true);
    try {
      const { device, asset } = await services.discovery.approve(access, refOf(item), { deviceName, locationId, association, reason });
      toast.show({
        tone: 'success',
        title: isCandidate ? 'Dispositivo aprovado e incorporado' : 'Localização confirmada',
        message: `${device.name}${asset ? ` associado a ${asset.tag}` : ' sem associação a ativo'}.${isCandidate ? ' Os pontos de dado já estão no Monitor.' : ''}`,
      });
      onClose();
      if (asset && assoc === 'novo') navigate(paths.asset(asset.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="large"
      title="Revisar e aprovar"
      onClose={onClose}
      footerStart={
        <Button variant="link" onClick={onClose}>
          Cancelar
        </Button>
      }
      footerEnd={
        <Button icon="check" loading={busy} onClick={approve}>
          Aprovar
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <Alert tone="error" title="Não foi possível aprovar">
            {error}
          </Alert>
        )}
        <TextField label="Nome do dispositivo" required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
        <SelectField
          label="Localização física confirmada"
          required
          emptyLabel="Selecione"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          options={locationOptions}
          helper={suggestedLocation ? 'Pré-preenchida com a sugestão da descoberta — confirme ou corrija.' : 'A descoberta não identificou o local: informe onde o equipamento está.'}
        />
        <fieldset className={styles.fieldset}>
          <legend>Associação a ativo</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(
              [
                ['existente', suggestedAsset ? `Associar a ativo existente (sugerido: ${suggestedAsset.tag})` : 'Associar a ativo existente'],
                ['novo', 'Criar novo ativo na Central'],
                ['nenhuma', 'Sem associação (equipamento de infraestrutura)'],
              ] as [AssocKind, string][]
            ).map(([value, label]) => (
              <label key={value} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="radio" name="assoc" value={value} checked={assoc === value} onChange={() => setAssoc(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {assoc === 'existente' && (
          <SelectField label="Ativo" required emptyLabel="Selecione" value={assetId} onChange={(e) => setAssetId(e.target.value)} options={assets.map((a) => ({ value: a.id, label: `${a.tag} · ${a.name}` }))} />
        )}
        {assoc === 'novo' && (
          <div className={styles.formGrid}>
            <TextField label="Tag do novo ativo" required value={newAsset.tag} onChange={(e) => setNewAsset((a) => ({ ...a, tag: e.target.value }))} />
            <TextField label="Nome do novo ativo" required value={newAsset.name} onChange={(e) => setNewAsset((a) => ({ ...a, name: e.target.value }))} />
            <SelectField
              label="Classificação"
              required
              emptyLabel="Selecione"
              value={newAsset.classificationId}
              onChange={(e) => setNewAsset((a) => ({ ...a, classificationId: e.target.value }))}
              options={classifications.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="Criticidade intrínseca"
              required
              value={newAsset.criticality}
              onChange={(e) => setNewAsset((a) => ({ ...a, criticality: e.target.value as Criticality }))}
              options={(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => ({ value: c, label: CRITICALITY_LABEL[c] }))}
            />
            <p className="helper" style={{ gridColumn: '1 / -1' }}>
              O ativo usa a localização confirmada acima como localização principal e passa pelas mesmas validações de duplicidade do cadastro.
            </p>
          </div>
        )}
        <label htmlFor="approve-reason" style={{ fontWeight: 600 }}>
          Motivo da aprovação<span style={{ color: 'var(--sds-red)' }}> *</span>
        </label>
        <textarea id="approve-reason" className={styles.textarea} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: conferido em campo" />
      </div>
    </Modal>
  );
}
