import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  LabelValue,
  LabelValueGrid,
  PageHeader,
  Panel,
  SelectField,
  Stack,
  Tabs,
  tableStyles as t,
  useToast,
} from '@/components/ui';
import { CriticalityBadge, LocationPath, formatDateTime } from '@/components/domain';
import { CRITICALITY_LABEL, GROUP_CATEGORY_LABEL, GROUP_REACTION_LABEL, type GroupRule } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { GroupDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { centralPaths } from './centralPaths';
import { AuditStatusBadge, ReasonModal } from './shared';
import styles from './central.module.css';

type GroupTab = 'membros' | 'excecoes' | 'auditoria' | 'historico';

type PendingAction =
  | { kind: 'incluir' }
  | { kind: 'remover-inclusao'; assetId: string; tag: string }
  | { kind: 'excecao'; assetId: string; tag: string }
  | { kind: 'remover-excecao'; assetId: string; tag: string }
  | { kind: 'auditoria'; locationId: string; locationName: string };

/** Descrição legível dos critérios de uma regra. */
export function useRuleText() {
  const services = useServices();
  const access = useAccess();
  const classifications = services.central.classifications();
  return (rule: GroupRule) => {
    const parts: string[] = [];
    if (rule.classificationIds?.length)
      parts.push(`classificação ${rule.classificationIds.map((id) => classifications.find((c) => c.id === id)?.name ?? id).join(' ou ')}`);
    if (rule.criticalities?.length) parts.push(`criticidade ${rule.criticalities.map((c) => CRITICALITY_LABEL[c].toLowerCase()).join(' ou ')}`);
    if (rule.locationIds?.length)
      parts.push(`em ${rule.locationIds.map((id) => services.locations.pathOf(access, id).slice(-1)[0]?.name ?? 'local fora do escopo').join(' ou ')}`);
    return parts.join(' e ') || 'sem critérios';
  };
}

/**
 * Detalhe do grupo (docs/02): critérios, origem manual/automática, exceções,
 * auditoria local e histórico — separando auditoria de associação e de configuração.
 */
export function GroupDetailPage() {
  const { groupId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const [tab, setTab] = useState<GroupTab>('membros');
  const query = useServiceQuery(() => services.groups.get(access, groupId), [groupId, access]);
  usePageLabel(query.data?.group.name);
  const ruleText = useRuleText();

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="central">
        {(d) => {
          const { group, permissions } = d;
          return (
            <>
              <PageHeader
                title={group.name}
                breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Grupos', to: centralPaths.home({ aba: 'grupos' }) }, { label: group.name }]}
                description={
                  <span className={styles.badges} style={{ marginTop: 8 }}>
                    <Badge tone={group.category === 'especializado' ? 'gray' : group.category === 'corporativo' ? 'blue' : 'green'}>{GROUP_CATEGORY_LABEL[group.category]}</Badge>
                    {group.scopeLocationId && (
                      <span className="helper">
                        Grupo local: <LocationPath path={services.locations.pathOf(access, group.scopeLocationId)} tail={2} />
                      </span>
                    )}
                    <span className="helper">Administrado por {MODULES[group.ownerModule].name}</span>
                  </span>
                }
                actions={
                  permissions.editConfig ? (
                    <Button icon="pencil" onClick={() => navigate(centralPaths.editGroup(group.id))}>
                      Editar regras e configuração
                    </Button>
                  ) : undefined
                }
              />
              <Stack>
                {permissions.readOnlyReason && <Alert tone="info">{permissions.readOnlyReason}</Alert>}
                <div className={styles.split}>
                  <Panel title="Configuração">
                    <LabelValueGrid>
                      <LabelValue label="Descrição">{group.description || <span className="muted">Sem descrição</span>}</LabelValue>
                      <LabelValue label="Periodicidade mínima de auditoria">
                        {group.auditPeriodicityDays ? `${group.auditPeriodicityDays} dias` : <span className="muted">Não definida</span>}
                      </LabelValue>
                      <LabelValue label="Regras de associação">
                        {group.rules.length === 0 ? (
                          <span className="muted">Somente associação manual</span>
                        ) : (
                          <ul className={styles.previewList}>
                            {group.rules.map((r) => (
                              <li key={r.id}>
                                <strong>{r.description || 'Regra'}</strong>
                                <div className="helper">{ruleText(r)}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </LabelValue>
                    </LabelValueGrid>
                  </Panel>
                  <Panel title="Módulos consumidores" flush>
                    {group.category === 'especializado' ? (
                      <EmptyState compact icon="cube" title={`Grupo especializado de ${MODULES[group.ownerModule].name}.`} text="Não é compartilhado com outros módulos." />
                    ) : group.consumers.length === 0 ? (
                      <EmptyState compact icon="share-alt" title="Nenhum módulo autorizado a consumir este grupo." />
                    ) : (
                      <ul className={styles.previewList} style={{ listStyle: 'none', padding: 16, margin: 0 }}>
                        {group.consumers.map((c) => (
                          <li key={c.moduleId} style={{ padding: '4px 0' }}>
                            <strong>{MODULES[c.moduleId].name}</strong>{' '}
                            <Badge tone={c.reaction === 'nao-configurada' ? 'gray' : 'blue'}>{GROUP_REACTION_LABEL[c.reaction]}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {group.category !== 'especializado' && (
                      <p className="helper" style={{ padding: '0 16px 16px' }}>
                        Compartilhar não dispara ações: a reação é configurada em cada módulo consumidor.
                      </p>
                    )}
                  </Panel>
                </div>
                <Tabs
                  label="Abas do grupo"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { id: 'membros', label: 'Ativos associados', count: d.members.length },
                    { id: 'excecoes', label: 'Exceções', count: d.exceptions.length },
                    { id: 'auditoria', label: 'Auditoria local' },
                    { id: 'historico', label: 'Histórico' },
                  ]}
                />
                <GroupTabContent d={d} tab={tab} ruleText={ruleText} />
              </Stack>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function GroupTabContent({ d, tab, ruleText }: { d: GroupDetail; tab: GroupTab; ruleText: (r: GroupRule) => string }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [assetToInclude, setAssetToInclude] = useState('');
  const [historyKind, setHistoryKind] = useState<'' | 'associacao' | 'configuracao'>('');
  const { group, permissions } = d;
  const ruleName = (id: string) => group.rules.find((r) => r.id === id)?.description || 'Regra';

  const candidates = useMemo(() => {
    const inGroup = new Set([...d.members.map((m) => m.asset.id), ...d.exceptions.map((e) => e.asset.id)]);
    const scopeId = group.scopeLocationId;
    return services.central
      .assetOptions(access)
      .filter((a) => !inGroup.has(a.id))
      .filter((a) => !scopeId || services.locations.pathOf(access, a.primaryLocationId).some((l) => l.id === scopeId));
  }, [services, access, d, group.scopeLocationId]);

  const run = async (reason: string) => {
    if (!pending) return;
    const id = group.id;
    switch (pending.kind) {
      case 'incluir': {
        if (!assetToInclude) throw new Error('Selecione o ativo a incluir.');
        await services.groups.includeAsset(access, id, assetToInclude, reason);
        const tag = candidates.find((a) => a.id === assetToInclude)?.tag;
        toast.show({ tone: 'success', title: 'Ativo incluído no grupo', message: `${tag} · inclusão manual registrada no histórico.` });
        setAssetToInclude('');
        break;
      }
      case 'remover-inclusao':
        await services.groups.removeInclusion(access, id, pending.assetId, reason);
        toast.show({ tone: 'success', title: 'Inclusão manual removida', message: pending.tag });
        break;
      case 'excecao':
        await services.groups.addException(access, id, pending.assetId, reason);
        toast.show({ tone: 'success', title: 'Exceção criada', message: `${pending.tag} permanece fora do grupo até a exceção ser removida.` });
        break;
      case 'remover-excecao':
        await services.groups.removeException(access, id, pending.assetId, reason);
        toast.show({ tone: 'success', title: 'Exceção removida', message: `${pending.tag}: as regras voltam a valer.` });
        break;
      case 'auditoria':
        await services.groups.registerAudit(access, id, pending.locationId, reason);
        toast.show({ tone: 'success', title: 'Auditoria local concluída', message: pending.locationName });
        break;
    }
    setPending(null);
  };

  const modalTitle: Record<PendingAction['kind'], string> = {
    incluir: 'Incluir ativo manualmente',
    'remover-inclusao': 'Remover inclusão manual',
    excecao: 'Criar exceção',
    'remover-excecao': 'Remover exceção',
    auditoria: 'Concluir auditoria local',
  };

  return (
    <>
      {tab === 'membros' && (
        <Panel
          title="Ativos associados"
          flush
          actions={
            permissions.manageAssociations ? (
              <Button size="small" icon="plus" onClick={() => setPending({ kind: 'incluir' })}>
                Incluir ativo
              </Button>
            ) : undefined
          }
        >
          {d.members.length === 0 ? (
            <EmptyState compact icon="object-group" title="Nenhum ativo associado no seu escopo." />
          ) : (
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Ativos associados ao grupo</caption>
                <thead>
                  <tr>
                    <th scope="col">Ativo</th>
                    <th scope="col">Local</th>
                    <th scope="col">Criticidade</th>
                    <th scope="col">Origem da associação</th>
                    {permissions.manageAssociations && (
                      <th scope="col">
                        <span className="visually-hidden">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {d.members.map((m) => (
                    <tr key={m.asset.id}>
                      <td>
                        <ContextLink to={paths.asset(m.asset.id)}>{m.asset.tag}</ContextLink>
                        <div className="helper">{m.asset.name}</div>
                      </td>
                      <td>
                        <LocationPath path={m.locationPath} tail={2} />
                      </td>
                      <td>
                        <CriticalityBadge value={m.asset.criticality} />
                      </td>
                      <td>
                        <div className={styles.badges}>
                          {m.ruleIds.map((r) => (
                            <Badge key={r} tone="blue" title={ruleText(group.rules.find((x) => x.id === r)!)}>
                              Regra: {ruleName(r)}
                            </Badge>
                          ))}
                          {m.manual && (
                            <Badge tone="gray" title={m.manualReason}>
                              Manual
                            </Badge>
                          )}
                        </div>
                        {m.manual && m.manualReason && <div className="helper">{m.manualReason}</div>}
                      </td>
                      {permissions.manageAssociations && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {m.manual && (
                            <Button size="small" variant="link" onClick={() => setPending({ kind: 'remover-inclusao', assetId: m.asset.id, tag: m.asset.tag })}>
                              Remover inclusão
                            </Button>
                          )}
                          {!m.manual && m.ruleIds.length > 0 && (
                            <Button size="small" variant="link" onClick={() => setPending({ kind: 'excecao', assetId: m.asset.id, tag: m.asset.tag })}>
                              Criar exceção
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {d.hiddenOutOfScope > 0 && (
            <p className="helper" style={{ padding: '8px 16px' }}>
              {d.hiddenOutOfScope} ativo(s) associado(s) fora do seu escopo não são exibidos.
            </p>
          )}
        </Panel>
      )}

      {tab === 'excecoes' && (
        <Panel title="Exceções" flush>
          {d.exceptions.length === 0 ? (
            <EmptyState compact icon="check" title="Nenhuma exceção registrada." text="Exceções mantêm um ativo fora do grupo mesmo que uma regra o inclua." />
          ) : (
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Exceções do grupo</caption>
                <thead>
                  <tr>
                    <th scope="col">Ativo</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Registrada por</th>
                    <th scope="col">Conflito</th>
                    {permissions.manageAssociations && (
                      <th scope="col">
                        <span className="visually-hidden">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {d.exceptions.map((e) => (
                    <tr key={e.asset.id}>
                      <td>
                        <ContextLink to={paths.asset(e.asset.id)}>{e.asset.tag}</ContextLink>
                        <div className="helper">{e.asset.name}</div>
                      </td>
                      <td>{e.reason}</td>
                      <td>
                        {e.byName}
                        <div className="helper">{formatDateTime(e.at)}</div>
                      </td>
                      <td>
                        {e.conflictingRuleIds.length > 0 ? (
                          <Badge tone="yellow" title="A regra incluiria o ativo; a exceção prevalece até ser removida.">
                            Conflita com: {e.conflictingRuleIds.map(ruleName).join(', ')}
                          </Badge>
                        ) : (
                          <span className="helper">Nenhuma regra inclui o ativo hoje</span>
                        )}
                      </td>
                      {permissions.manageAssociations && (
                        <td>
                          <Button size="small" variant="link" onClick={() => setPending({ kind: 'remover-excecao', assetId: e.asset.id, tag: e.asset.tag })}>
                            Remover exceção
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'auditoria' && (
        <Panel title="Auditoria local de associações" flush>
          {d.auditStatus.length === 0 ? (
            <EmptyState compact icon="calendar-check-o" title="Nenhuma unidade do seu escopo para auditar." />
          ) : (
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Auditoria por unidade</caption>
                <thead>
                  <tr>
                    <th scope="col">Local</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Última auditoria</th>
                    {permissions.registerAudit && (
                      <th scope="col">
                        <span className="visually-hidden">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {d.auditStatus.map((row) => (
                    <tr key={row.location.id}>
                      <td>{row.location.name}</td>
                      <td>
                        <AuditStatusBadge value={row.status} />
                      </td>
                      <td>
                        {row.lastAudit ? (
                          <>
                            {formatDateTime(row.lastAudit.at)} · {row.lastAudit.byName}
                            <div className="helper">
                              {row.lastAudit.membersReviewed} associação(ões) revisada(s) — {row.lastAudit.notes}
                            </div>
                          </>
                        ) : (
                          <span className="muted">Nunca auditado</span>
                        )}
                      </td>
                      {permissions.registerAudit && (
                        <td>
                          <Button
                            size="small"
                            variant="secondary"
                            icon="check"
                            onClick={() => setPending({ kind: 'auditoria', locationId: row.location.id, locationName: row.location.name })}
                          >
                            Concluir auditoria
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="helper" style={{ padding: '8px 16px' }}>
            A auditoria local é concluída sem aprovação corporativa; o corporativo acompanha a situação consolidada de todas as unidades.
          </p>
        </Panel>
      )}

      {tab === 'historico' && (
        <Panel
          title="Histórico"
          flush
          actions={
            <select
              aria-label="Tipo de registro"
              value={historyKind}
              onChange={(e) => setHistoryKind(e.target.value as typeof historyKind)}
              style={{ minHeight: 28, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
            >
              <option value="">Associação e configuração</option>
              <option value="associacao">Somente associação</option>
              <option value="configuracao">Somente configuração</option>
            </select>
          }
        >
          {d.history.filter((h) => !historyKind || h.kind === historyKind).length === 0 ? (
            <EmptyState compact icon="history" title="Nenhum registro." />
          ) : (
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Histórico do grupo</caption>
                <thead>
                  <tr>
                    <th scope="col">Data/hora</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Registro</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Ator</th>
                  </tr>
                </thead>
                <tbody>
                  {d.history
                    .filter((h) => !historyKind || h.kind === historyKind)
                    .map((h) => (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.at)}</td>
                        <td>
                          <Badge tone={h.kind === 'configuracao' ? 'blue' : 'gray'}>{h.kind === 'configuracao' ? 'Configuração' : 'Associação'}</Badge>
                          <div className="helper">Origem: {h.origin}</div>
                        </td>
                        <td>{h.summary}</td>
                        <td>{h.reason}</td>
                        <td>{h.actorName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <ReasonModal
        open={pending !== null}
        title={pending ? modalTitle[pending.kind] : ''}
        label={pending?.kind === 'auditoria' ? 'Observações da auditoria' : 'Motivo'}
        confirmLabel={pending?.kind === 'auditoria' ? 'Concluir auditoria' : 'Confirmar'}
        destructive={pending?.kind === 'remover-inclusao'}
        onCancel={() => setPending(null)}
        onConfirm={run}
      >
        {pending?.kind === 'incluir' && (
          <SelectField
            label="Ativo"
            required
            emptyLabel="Selecione"
            value={assetToInclude}
            onChange={(e) => setAssetToInclude(e.target.value)}
            options={candidates.map((a) => ({ value: a.id, label: `${a.tag} · ${a.name}` }))}
            helper={group.scopeLocationId ? 'Somente ativos da localização deste grupo local.' : 'Somente ativos do seu escopo que ainda não estão no grupo.'}
          />
        )}
        {pending?.kind === 'excecao' && (
          <p className="helper">
            {pending.tag} é incluído por regra. A exceção o mantém fora do grupo e persiste até ser removida explicitamente; o conflito fica sinalizado.
          </p>
        )}
        {pending?.kind === 'remover-excecao' && <p className="helper">Sem a exceção, as regras voltam a decidir se {pending.tag} faz parte do grupo.</p>}
        {pending?.kind === 'auditoria' && (
          <p className="helper">Confirma que as associações do grupo em {pending.locationName} foram revisadas.</p>
        )}
      </ReasonModal>
    </>
  );
}
