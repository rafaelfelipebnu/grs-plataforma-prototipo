import { useNavigate } from 'react-router-dom';
import { moduleAccess } from '@/access';
import { Alert, Button, EmptyState, Panel, Stack } from '@/components/ui';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { OrderRows, RequestRows } from './MaintenanceHomePage';
import { maintenancePaths } from './shared';

/**
 * Solicitações e OS do ativo no painel 360º da Central. A Central consulta;
 * a Manutenção continua dona dos dados e das regras (CLAUDE.md).
 */
export function AssetMaintenancePanel({ assetId }: { assetId: string }) {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const state = moduleAccess(access, 'manutencao');
  const query = useServiceQuery(
    () => (state === 'available' ? services.maintenance.forAsset(access, assetId) : Promise.resolve(null)),
    [assetId, access, state],
  );

  if (state === 'not-contracted') {
    return (
      <Alert tone="info" title="Solicitações e ordens de serviço">
        Abrir solicitação e consultar ordens de serviço a partir do ativo estão disponíveis com a Gestão de Manutenção contratada.
      </Alert>
    );
  }
  if (state === 'no-permission') {
    return (
      <Alert tone="info" title="Solicitações e ordens de serviço">
        Seu perfil não acessa a Gestão de Manutenção.
      </Alert>
    );
  }
  const data = query.data;
  const canRequest = services.maintenance.permissions(access).request;
  return (
    <Stack>
      <Panel
        title={`Solicitações de manutenção${data ? ` (${data.requests.length})` : ''}`}
        actions={
          canRequest ? (
            <Button size="small" icon="plus" onClick={() => navigate(maintenancePaths.newRequest(assetId))}>
              Abrir solicitação
            </Button>
          ) : undefined
        }
        flush
      >
        {!data ? null : data.requests.length === 0 ? <EmptyState compact icon="inbox" title="Nenhuma solicitação para este ativo." /> : <RequestRows items={data.requests} />}
      </Panel>
      <Panel title={`Ordens de serviço${data ? ` (${data.orders.length})` : ''}`} flush>
        {!data ? null : data.orders.length === 0 ? <EmptyState compact icon="wrench" title="Nenhuma ordem de serviço para este ativo." /> : <OrderRows items={data.orders} />}
      </Panel>
    </Stack>
  );
}
