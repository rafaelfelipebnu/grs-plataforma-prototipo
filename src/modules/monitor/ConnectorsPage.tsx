import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '@/access';
import { Alert, Badge, Button, EmptyState, PageHeader, Panel, SelectField, Stack, TextField, tableStyles as t, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { PROTOCOL_LIST, type Protocol } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { ConnectorInput, ConnectorItem } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { ReasonModal, errorMessage } from '@/modules/central/shared';
import { MonitorNav, monitorPaths } from './MonitorNav';

type Pending = { kind: 'novo' } | { kind: 'ativar' | 'desativar'; item: ConnectorItem };

/** Conectores do agente GRS (simulados). Configuração exige autorização e motivo. */
export function ConnectorsPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  usePageLabel('Conectores');
  const units = useLocationOptions(0);
  const query = useServiceQuery(() => services.monitor.listConnectors(access), [access]);
  const manage = can(access, 'monitor.manage');
  const [pending, setPending] = useState<Pending | null>(null);
  const [form, setForm] = useState<ConnectorInput>({ name: '', protocol: 'Modbus', unitLocationId: '', networkScope: '' });
  const [running, setRunning] = useState<string | null>(null);

  const discover = async (item: ConnectorItem) => {
    setRunning(item.connector.id);
    try {
      const { run } = await services.monitor.runDiscovery(access, item.connector.id);
      toast.show({
        tone: run.newCandidates > 0 ? 'success' : 'info',
        title: run.newCandidates > 0 ? `${run.newCandidates} novo(s) dispositivo(s) descoberto(s)` : 'Nenhum dispositivo novo',
        message:
          run.newCandidates > 0
            ? 'Descoberta somente leitura: nada foi criado ou associado. Os dispositivos aguardam revisão na Central.'
            : `${run.found} dispositivo(s) responderam; todos já são conhecidos.`,
      });
    } catch (e) {
      toast.show({ tone: 'error', title: 'Não foi possível executar a descoberta', message: errorMessage(e) });
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Conectores"
        breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Conectores' }]}
        description="Agente GRS compartilhado com conectores por protocolo. Conexões simuladas: nenhum equipamento real é acessado."
        actions={
          manage ? (
            <Button icon="plus" onClick={() => setPending({ kind: 'novo' })}>
              Novo conector
            </Button>
          ) : undefined
        }
      />
      <MonitorNav />
      <QueryBoundary query={query} moduleId="monitor">
        {(items) => (
          <Stack>
            {!manage && <Alert tone="info">Seu perfil pode consultar os conectores, mas não configurá-los nem executar descobertas.</Alert>}
            <Panel title={`Conectores (${items.length})`} flush>
              {items.length === 0 ? (
                <EmptyState compact icon="plug" title="Nenhum conector no seu escopo." />
              ) : (
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <caption className="visually-hidden">Conectores</caption>
                    <thead>
                      <tr>
                        <th scope="col">Conector</th>
                        <th scope="col">Protocolo</th>
                        <th scope="col">Unidade</th>
                        <th scope="col">Situação</th>
                        <th scope="col">Dispositivos</th>
                        <th scope="col">Última descoberta</th>
                        {manage && (
                          <th scope="col">
                            <span className="visually-hidden">Ações</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const c = item.connector;
                        return (
                          <tr key={c.id}>
                            <td style={{ minWidth: 220 }}>
                              {c.name}
                              <div className="helper">
                                {c.networkScope} · <Badge tone="gray">Simulado</Badge>
                              </div>
                            </td>
                            <td>{c.protocol}</td>
                            <td>{item.unitName}</td>
                            <td>{c.active ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Desativado — coleta pausada</Badge>}</td>
                            <td>
                              {item.deviceCount}
                              {item.pendingCandidates > 0 && <div className="helper">{item.pendingCandidates} aguardando revisão</div>}
                            </td>
                            <td>{c.lastDiscoveryAt ? formatDateTime(c.lastDiscoveryAt) : <span className="muted">Nunca executada</span>}</td>
                            {manage && (
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <Button size="small" variant="secondary" icon="search" disabled={!c.active} loading={running === c.id} onClick={() => discover(item)}>
                                  Descobrir
                                </Button>{' '}
                                <Button size="small" variant="link" onClick={() => setPending({ kind: c.active ? 'desativar' : 'ativar', item })}>
                                  {c.active ? 'Desativar' : 'Ativar'}
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <p className="helper">
              Após a descoberta, os dispositivos encontrados ficam em <ContextButton onClick={() => navigate(monitorPaths.discovery)} />. Criação e associação
              exigem aprovação na Central.
            </p>
          </Stack>
        )}
      </QueryBoundary>

      <ReasonModal
        open={pending !== null}
        title={pending?.kind === 'novo' ? 'Novo conector' : pending?.kind === 'ativar' ? 'Ativar conector' : 'Desativar conector'}
        confirmLabel={pending?.kind === 'novo' ? 'Configurar conector' : pending?.kind === 'ativar' ? 'Ativar' : 'Desativar'}
        destructive={pending?.kind === 'desativar'}
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return;
          if (pending.kind === 'novo') {
            const c = await services.monitor.createConnector(access, form, reason);
            toast.show({ tone: 'success', title: 'Conector configurado', message: `${c.name} (simulado). Execute a descoberta para encontrar dispositivos.` });
            setForm({ name: '', protocol: 'Modbus', unitLocationId: '', networkScope: '' });
          } else {
            const active = pending.kind === 'ativar';
            await services.monitor.setConnectorActive(access, pending.item.connector.id, active, reason);
            toast.show({ tone: 'success', title: active ? 'Conector ativado' : 'Conector desativado', message: active ? pending.item.connector.name : 'A coleta dos dispositivos deste conector fica pausada.' });
          }
          setPending(null);
        }}
      >
        {pending?.kind === 'novo' ? (
          <>
            <TextField label="Nome" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Agente GRS Joinville · BACnet 2" />
            <SelectField label="Protocolo" required value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value as Protocol }))} options={PROTOCOL_LIST.map((p) => ({ value: p, label: p }))} />
            <SelectField label="Unidade do agente" required emptyLabel="Selecione" value={form.unitLocationId} onChange={(e) => setForm((f) => ({ ...f, unitLocationId: e.target.value }))} options={units} />
            <TextField label="Faixa de rede ou endpoint" required value={form.networkScope} onChange={(e) => setForm((f) => ({ ...f, networkScope: e.target.value }))} helper="Fictício. Credenciais não são coletadas no protótipo." />
          </>
        ) : pending?.kind === 'desativar' ? (
          <p className="helper">Sem o conector, a coleta e a descoberta dos dispositivos de {pending.item.connector.name} ficam pausadas.</p>
        ) : null}
      </ReasonModal>
    </>
  );
}

function ContextButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="link" size="small" onClick={onClick}>
      Descoberta
    </Button>
  );
}
