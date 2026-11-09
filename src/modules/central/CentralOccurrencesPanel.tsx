import { moduleAccess } from '@/access';
import { EmptyState, ErrorState, LoadingState, Panel, tableStyles as t } from '@/components/ui';
import { LocationPath, formatDateTime, formatRelative } from '@/components/domain';
import type { Id } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { OccurrencePriorityBadge, OccurrenceStatusBadge, occurrencePaths } from '@/modules/ocorrencias/shared';

const LIMIT = 10;

/**
 * Ocorrências em aberto de um local (com descendentes) ou de um ativo, consultadas
 * na Gestão de Ocorrências. A Central apresenta; tratar e concluir acontecem no módulo.
 */
export function CentralOccurrencesPanel({ locationId, includeDescendants = true, assetId }: { locationId?: Id; includeDescendants?: boolean; assetId?: Id }) {
  const access = useAccess();
  const services = useServices();
  const state = moduleAccess(access, 'ocorrencias');
  const available = state === 'available';
  const query = useServiceQuery(
    async () => (available ? services.occurrences.list(access, { status: 'abertas', locationId, includeDescendants, assetId, pageSize: LIMIT }) : null),
    [access, locationId, includeDescendants, assetId, available],
  );

  const title = `Ocorrências em aberto${query.data ? ` (${query.data.total})` : ''}`;
  if (state === 'not-contracted') {
    return (
      <Panel title="Ocorrências">
        <EmptyState compact icon="lock" title={`${MODULES.ocorrencias.name} não contratada`} text={MODULES.ocorrencias.valueProposition} />
      </Panel>
    );
  }
  if (state === 'no-permission') {
    return (
      <Panel title="Ocorrências">
        <EmptyState compact icon="eye-slash" title="Seu perfil não consulta ocorrências." />
      </Panel>
    );
  }
  const items = query.data?.items ?? [];
  return (
    <Panel
      title={title}
      flush
      actions={
        <ContextLink to={`${occurrencePaths.search}?status=abertas`} className="helper">
          Abrir na Gestão de Ocorrências
        </ContextLink>
      }
    >
      {query.error ? (
        <ErrorState compact kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} text={query.error.message} />
      ) : !query.data ? (
        <LoadingState compact />
      ) : items.length === 0 ? (
        <EmptyState compact icon="check-circle" title={assetId ? 'Nenhuma ocorrência em aberto para este ativo.' : 'Nenhuma ocorrência em aberto neste local.'} />
      ) : (
        <>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <caption className="visually-hidden">Ocorrências em aberto</caption>
              <thead>
                <tr>
                  <th scope="col">Ocorrência</th>
                  <th scope="col">Local</th>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registrada</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ occurrence: o, type, asset, locationPath, awaitingApproval }) => (
                  <tr key={o.id}>
                    <td style={{ minWidth: 200 }}>
                      <ContextLink to={occurrencePaths.detail(o.id)}>
                        {o.code} — {type.name}
                      </ContextLink>
                      {asset && !assetId && <div className="helper">{asset.tag}</div>}
                      {awaitingApproval && <div className="helper">Aguardando aprovação da conclusão</div>}
                    </td>
                    <td>
                      <LocationPath path={locationPath} tail={2} />
                    </td>
                    <td>
                      <OccurrencePriorityBadge value={o.priority} />
                    </td>
                    <td>
                      <OccurrenceStatusBadge value={o.status} />
                    </td>
                    <td title={formatDateTime(o.createdAt)} style={{ whiteSpace: 'nowrap' }}>
                      {formatRelative(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.total > items.length && (
            <p className="helper" style={{ padding: '8px 16px' }}>
              Mostrando {items.length} de {query.data.total}. Veja todas na Gestão de Ocorrências.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
