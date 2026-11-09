import { Alert, Badge, EmptyState, Icon } from '@/components/ui';
import { formatRelative } from '@/components/domain';
import { isModuleAvailable } from '@/access';
import type { Id } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { LinkedRecord, LinkedRecordRef } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { resolveTargetPath } from '@/app/navigation/targets';
import styles from './LinkedRecords.module.css';

/**
 * Registros dos módulos especialistas relacionados a um evento ou ativo.
 * Consulta Ocorrências e Manutenção (cada um aplica permissões e escopo);
 * a tela que integra só apresenta e leva ao módulo dono.
 */
export function useLinkedRecords(ref: LinkedRecordRef | null) {
  const access = useAccess();
  const services = useServices();
  return useServiceQuery(async () => {
    if (!ref || (!ref.eventId && !ref.assetId)) return [] as LinkedRecord[];
    const [occurrences, maintenance] = await Promise.all([
      isModuleAvailable(access, 'ocorrencias') ? services.occurrences.linkedRecords(access, ref) : Promise.resolve([]),
      isModuleAvailable(access, 'manutencao') ? services.maintenance.linkedRecords(access, ref) : Promise.resolve([]),
    ]);
    return [...occurrences, ...maintenance].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [access, ref?.eventId, ref?.assetId, ref?.openOnly]);
}

export function LinkedRecordList({ records, empty }: { records: LinkedRecord[]; empty: string }) {
  const access = useAccess();
  const services = useServices();
  if (records.length === 0) return <EmptyState compact icon="link" title={empty} />;
  return (
    <ul className={styles.list}>
      {records.map((r) => {
        const path = resolveTargetPath(r.target, access, services);
        return (
          <li key={`${r.moduleId}-${r.id}`} className={styles.item}>
            <span className={styles.icon} title={MODULES[r.moduleId].name}>
              <Icon name={MODULES[r.moduleId].icon} />
            </span>
            <div className={styles.main}>
              <div className={styles.title}>
                {path ? <ContextLink to={path}>{r.code}</ContextLink> : <strong>{r.code}</strong>} — {r.title}
              </div>
              <div className="helper">
                {MODULES[r.moduleId].name} · {formatRelative(r.createdAt)}
              </div>
            </div>
            <Badge tone={r.open ? 'blue' : 'gray'}>{r.statusLabel}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Alerta contextual: registros ainda em aberto sobre o ativo. Informa sem
 * bloquear — o novo registro, se criado, é independente (não há associação
 * nem deduplicação automática).
 */
export function OpenRecordsNotice({ assetId, assetTag, excludeIds = [] }: { assetId?: Id; assetTag?: string; excludeIds?: Id[] }) {
  const query = useLinkedRecords(assetId ? { assetId, openOnly: true } : null);
  const records = (query.data ?? []).filter((r) => !excludeIds.includes(r.id));
  if (!assetId || records.length === 0) return null;
  return (
    <Alert tone="warning" title={`Registros em aberto para ${assetTag ?? 'este ativo'}`}>
      <p style={{ marginBottom: 8 }}>Confira se a situação já está sendo tratada. Você pode continuar: um novo registro fica independente dos existentes.</p>
      <LinkedRecordList records={records} empty="" />
    </Alert>
  );
}
