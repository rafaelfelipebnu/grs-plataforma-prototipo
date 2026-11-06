import { useState } from 'react';
import { can } from '@/access';
import { Alert, Badge, Button, EmptyState, PageHeader, Panel, Stack, tableStyles as t, useToast } from '@/components/ui';
import { SeverityBadge, formatDateTime } from '@/components/domain';
import { RULE_OPERATOR_LABEL, type MonitoringRule } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { RuleItem } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { ReasonModal } from '@/modules/central/shared';
import { MonitorNav, monitorPaths } from './MonitorNav';
import { RuleModal } from './RuleModal';

/** Regras técnicas de monitoramento. Alterar ou desativar exige autorização e motivo. */
export function RulesPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  usePageLabel('Regras de monitoramento');
  const query = useServiceQuery(() => services.monitor.listRules(access), [access]);
  const manage = can(access, 'monitor.manage');
  const [editing, setEditing] = useState<{ rule?: MonitoringRule } | null>(null);
  const [toggling, setToggling] = useState<RuleItem | null>(null);

  return (
    <>
      <PageHeader
        title="Regras de monitoramento"
        breadcrumb={[{ label: MODULES.monitor.name, to: monitorPaths.overview }, { label: 'Regras' }]}
        description="Regras técnicas sobre pontos de dado que geram alertas de infraestrutura. Alertas com impacto em segurança chegam ao Security Hub."
        actions={
          manage ? (
            <Button icon="plus" onClick={() => setEditing({})}>
              Nova regra
            </Button>
          ) : undefined
        }
      />
      <MonitorNav />
      <QueryBoundary query={query} moduleId="monitor">
        {(items) => (
          <Stack>
            {!manage && <Alert tone="info">Seu perfil pode consultar as regras, mas não alterá-las.</Alert>}
            <Panel title={`Regras (${items.length})`} flush>
              {items.length === 0 ? (
                <EmptyState compact icon="sliders" title="Nenhuma regra no seu escopo." />
              ) : (
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <caption className="visually-hidden">Regras de monitoramento</caption>
                    <thead>
                      <tr>
                        <th scope="col">Regra</th>
                        <th scope="col">Ponto</th>
                        <th scope="col">Severidade</th>
                        <th scope="col">Situação</th>
                        <th scope="col">Último disparo</th>
                        {manage && (
                          <th scope="col">
                            <span className="visually-hidden">Ações</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const r = item.rule;
                        return (
                          <tr key={r.id}>
                            <td style={{ minWidth: 220 }}>
                              {r.name}
                              <div className="helper">
                                Valor {RULE_OPERATOR_LABEL[r.operator]} {String(r.threshold)} {item.point.unit}
                              </div>
                            </td>
                            <td>
                              <ContextLink to={monitorPaths.point(item.point.id)}>{item.point.name}</ContextLink>
                              <div className="helper">
                                {item.device.name}
                                {item.asset && (
                                  <>
                                    {' · '}
                                    <ContextLink to={paths.asset(item.asset.id)}>{item.asset.tag}</ContextLink>
                                  </>
                                )}
                              </div>
                            </td>
                            <td>
                              <SeverityBadge value={r.severity} />
                            </td>
                            <td>
                              <Badge tone={r.active ? 'green' : 'gray'}>{r.active ? 'Ativa' : 'Desativada'}</Badge>
                              {item.activeAlert && (
                                <div className="helper">
                                  Alerta ativo: <ContextLink to={paths.event(item.activeAlert.id)}>{item.activeAlert.code}</ContextLink>
                                </div>
                              )}
                            </td>
                            <td>{r.lastTriggeredAt ? formatDateTime(r.lastTriggeredAt) : <span className="muted">Nunca</span>}</td>
                            {manage && (
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <Button size="small" variant="link" onClick={() => setEditing({ rule: r })}>
                                  Editar
                                </Button>
                                <Button size="small" variant="link" onClick={() => setToggling(item)}>
                                  {r.active ? 'Desativar' : 'Ativar'}
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
          </Stack>
        )}
      </QueryBoundary>
      <RuleModal open={editing !== null} rule={editing?.rule} onClose={() => setEditing(null)} />
      <ReasonModal
        open={toggling !== null}
        title={toggling?.rule.active ? 'Desativar regra' : 'Ativar regra'}
        confirmLabel={toggling?.rule.active ? 'Desativar' : 'Ativar'}
        destructive={toggling?.rule.active}
        onCancel={() => setToggling(null)}
        onConfirm={async (reason) => {
          if (!toggling) return;
          const active = !toggling.rule.active;
          const { triggered } = await services.monitor.setRuleActive(access, toggling.rule.id, active, reason);
          toast.show({
            tone: triggered.length ? 'warning' : 'success',
            title: active ? 'Regra ativada' : 'Regra desativada',
            message: triggered.length ? `O valor atual viola a regra: alerta ${triggered[0]!.code} gerado.` : toggling.rule.name,
          });
          setToggling(null);
        }}
      >
        {toggling?.rule.active && <p className="helper">Sem a regra, novas leituras deste ponto deixam de gerar alertas. Alertas já abertos permanecem.</p>}
      </ReasonModal>
    </>
  );
}
