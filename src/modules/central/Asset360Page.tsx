import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { isModuleAvailable, moduleAccess } from '@/access';
import {
  Badge,
  Button,
  Col,
  EmptyState,
  Grid,
  Icon,
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
import {
  AlertStatusBadge,
  ConditionBadge,
  CriticalityBadge,
  DeviceLocationBadge,
  LocationPath,
  SeverityBadge,
  formatDateTime,
  formatRelative,
} from '@/components/domain';
import { CONDITION_LABEL, GROUP_CATEGORY_LABEL, MODULE_IDS, type ModuleId, type OperationalCondition } from '@/domain';
import { MODULES } from '@/modules/registry';
import type { Asset360 } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { paths } from '@/app/navigation/targets';
import { useAcknowledge } from '@/modules/security-hub/widgets/useAcknowledge';
import { QueryBoundary } from '@/pages/QueryBoundary';
import { AssetMaintenancePanel } from '@/modules/manutencao/AssetMaintenancePanel';
import { LocationLink, PersonRef, SOURCE_LABEL } from '@/pages/records/shared';
import { centralPaths } from './centralPaths';
import { ReasonModal } from './shared';
import styles from './central.module.css';
import pageStyles from '@/pages/Pages.module.css';

type Tab360 = 'visao-geral' | 'dispositivos' | 'modulos' | 'operacao' | 'riscos' | 'relacionamentos' | 'historico';

const TABS: { id: Tab360; label: string }[] = [
  { id: 'visao-geral', label: 'Visão geral' },
  { id: 'dispositivos', label: 'Dispositivos' },
  { id: 'modulos', label: 'Módulos GRS' },
  { id: 'operacao', label: 'Operação' },
  { id: 'riscos', label: 'Riscos' },
  { id: 'relacionamentos', label: 'Relacionamentos' },
  { id: 'historico', label: 'Histórico' },
];

/**
 * Painel 360º do ativo (docs/02): página completa com cabeçalho persistente
 * (identidade, localização, criticidade e condição) e abas. Consulta os
 * domínios dos módulos sem absorver sua lógica; abas de módulos não
 * contratados explicam o valor sem expor dados.
 */
export function Asset360Page() {
  const { assetId = '' } = useParams();
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('aba');
  const tab: Tab360 = TABS.some((x) => x.id === tabParam) ? (tabParam as Tab360) : 'visao-geral';
  const [conditionOpen, setConditionOpen] = useState(false);
  const query = useServiceQuery(() => services.central.getAsset360(access, assetId), [assetId, access]);
  usePageLabel(query.data ? `${query.data.asset.tag} · ${query.data.asset.name}` : undefined);

  return (
    <>
      <ReturnBar />
      <QueryBoundary query={query} moduleId="central">
        {(s) => {
          const { asset } = s;
          const conditionSource = asset.conditionSource.kind === 'manual' ? 'informada manualmente' : `alimentada por ${MODULES[asset.conditionSource.moduleId].name}`;
          return (
            <>
              <div className={styles.headerBar}>
                <PageHeader
                  title={`${asset.tag} · ${asset.name}`}
                  breadcrumb={[
                    { label: MODULES.central.name, to: '/central' },
                    { label: s.primaryLocationPath[s.primaryLocationPath.length - 1]?.name ?? 'Ativos', to: centralPaths.home({ local: asset.primaryLocationId, aba: 'ativos' }) },
                    { label: asset.tag },
                  ]}
                  description={
                    <span className={pageStyles.recordHeader}>
                      <LocationPath path={s.primaryLocationPath} />
                      <span title="Criticidade intrínseca: importância própria do ativo">
                        <CriticalityBadge value={asset.criticality} />
                      </span>
                      <span title="Condição operacional atual">
                        <ConditionBadge value={asset.condition} />
                      </span>
                      <span className="helper">
                        Condição {conditionSource} · {formatDateTime(asset.conditionUpdatedAt)}
                      </span>
                    </span>
                  }
                  actions={
                    s.canManage ? (
                      <>
                        <Button variant="secondary" icon="tachometer" onClick={() => setConditionOpen(true)}>
                          Alterar condição
                        </Button>
                        <Button icon="pencil" onClick={() => navigate(centralPaths.editAsset(asset.id))}>
                          Editar cadastro
                        </Button>
                      </>
                    ) : undefined
                  }
                />
                <Tabs
                  label="Abas do painel do ativo"
                  items={TABS.map((x) => ({
                    ...x,
                    count: x.id === 'dispositivos' ? s.devices.length : x.id === 'operacao' ? s.events.filter((e) => e.event.status === 'ativo').length || undefined : undefined,
                  }))}
                  value={tab}
                  onChange={(next) => setSearchParams(next === 'visao-geral' ? {} : { aba: next }, { replace: true, state: routerLocation.state })}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                {tab === 'visao-geral' && <OverviewSection s={s} />}
                {tab === 'dispositivos' && <DevicesSection s={s} />}
                {tab === 'modulos' && <ModulesSection s={s} />}
                {tab === 'operacao' && <OperationSection s={s} />}
                {tab === 'riscos' && <RisksSection />}
                {tab === 'relacionamentos' && <RelationshipsSection s={s} />}
                {tab === 'historico' && <HistorySection s={s} />}
              </div>
              <ConditionModal open={conditionOpen} asset360={s} onClose={() => setConditionOpen(false)} />
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function ConditionModal({ open, asset360, onClose }: { open: boolean; asset360: Asset360; onClose: () => void }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [condition, setCondition] = useState<OperationalCondition | ''>('');
  return (
    <ReasonModal
      open={open}
      title="Alterar condição operacional"
      confirmLabel="Alterar condição"
      onCancel={() => {
        setCondition('');
        onClose();
      }}
      onConfirm={async (reason) => {
        if (!condition) throw new Error('Selecione a nova condição.');
        await services.central.setCondition(access, asset360.asset.id, condition, reason);
        toast.show({ tone: 'success', title: 'Condição alterada', message: `${asset360.asset.tag}: ${CONDITION_LABEL[condition]}` });
        setCondition('');
        onClose();
      }}
    >
      <p className="helper">
        Condição é o estado operacional atual e é independente da criticidade. Atual: <strong>{CONDITION_LABEL[asset360.asset.condition]}</strong>. Módulos
        especialistas também podem alimentar a condição.
      </p>
      <SelectField
        label="Nova condição"
        required
        emptyLabel="Selecione"
        value={condition}
        onChange={(e) => setCondition(e.target.value as OperationalCondition | '')}
        options={(Object.keys(CONDITION_LABEL) as OperationalCondition[]).map((c) => ({ value: c, label: CONDITION_LABEL[c], disabled: c === asset360.asset.condition }))}
      />
    </ReasonModal>
  );
}

function ImpactSummary({ s }: { s: Asset360 }) {
  const i = s.impact;
  return (
    <div className={styles.impactGrid}>
      <div className={styles.impactItem}>
        <div className={styles.impactValue}>{i.servedLocations.length}</div>
        <div className="helper">Locais atendidos</div>
      </div>
      <div className={styles.impactItem}>
        <div className={styles.impactValue}>{i.directDependents.length}</div>
        <div className="helper">Ativos dependentes diretos</div>
      </div>
      <div className={styles.impactItem}>
        <div className={styles.impactValue}>{i.indirectDependents.length}</div>
        <div className="helper">Dependentes indiretos</div>
      </div>
      <div className={styles.impactItem}>
        <div className={styles.impactValue}>{i.securitySystemsAffected.length}</div>
        <div className="helper">Sistemas de segurança afetados</div>
      </div>
    </div>
  );
}

function OverviewSection({ s }: { s: Asset360 }) {
  const { asset } = s;
  const active = s.events.filter((e) => e.event.status === 'ativo');
  return (
    <Stack>
      <Grid>
        <Col span={8}>
          <Panel title="Identidade mestre">
            <LabelValueGrid>
              <LabelValue label="Tag">{asset.tag}</LabelValue>
              <LabelValue label="Classificação">{s.classificationPath.map((c) => c.name).join(' › ')}</LabelValue>
              <LabelValue label="Localização principal">
                <LocationLink path={s.primaryLocationPath} />
              </LabelValue>
              <LabelValue label="Locais atendidos">
                {s.servedLocations.length === 0 ? <span className="muted">Nenhum</span> : s.servedLocations.map((l) => l.name).join(', ')}
              </LabelValue>
              <LabelValue label="Responsável">
                <PersonRef person={s.responsible} />
                <span className="helper" style={{ display: 'block' }}>
                  {s.responsibilityOrigin.kind === 'herdado'
                    ? `Herdado da localização ${s.responsibilityOrigin.fromLocation.name}`
                    : s.responsibilityOrigin.kind === 'direto'
                      ? 'Responsável direto do ativo'
                      : 'Sem responsável direto ou herdado'}
                </span>
              </LabelValue>
              <LabelValue label="Cadastro iniciado em">{MODULES[asset.registeredFrom].name}</LabelValue>
              <LabelValue label="Descrição">{asset.description || <span className="muted">Sem descrição</span>}</LabelValue>
            </LabelValueGrid>
          </Panel>
        </Col>
        <Col span={4}>
          <Panel title="Situação atual">
            <LabelValueGrid>
              <LabelValue label="Criticidade intrínseca">
                <CriticalityBadge value={asset.criticality} />
              </LabelValue>
              <LabelValue label="Condição operacional">
                <ConditionBadge value={asset.condition} />
              </LabelValue>
              <LabelValue label="Alertas ativos">{active.length}</LabelValue>
              <LabelValue label="Grupos">{s.groups.filter((g) => !g.excepted).length}</LabelValue>
            </LabelValueGrid>
          </Panel>
        </Col>
      </Grid>
      <Panel title="Impacto operacional">
        <p className="helper" style={{ marginBottom: 12 }}>
          Derivado de relacionamentos simples e explicáveis — não se confunde com a criticidade intrínseca. A fórmula consolidada do impacto ainda está
          em definição (Q-04).
        </p>
        <ImpactSummary s={s} />
      </Panel>
    </Stack>
  );
}

function DevicesSection({ s }: { s: Asset360 }) {
  if (s.devices.length === 0) {
    return (
      <Panel title="Dispositivos">
        <EmptyState icon="microchip" title="Ativo sem dispositivo conectado." text="Ativos sem dispositivo também fazem parte do cadastro compartilhado." />
      </Panel>
    );
  }
  return (
    <Panel title="Dispositivos" flush>
      <ul className={pageStyles.list}>
        {s.devices.map((d) => (
          <li key={d.id} className={pageStyles.listItem}>
            <div className={pageStyles.listItemMain}>
              <ContextLink to={paths.device(d.id)} className={pageStyles.listItemTitle}>
                {d.name}
              </ContextLink>
              <div className="helper">
                {d.deviceType} · {d.manufacturer} {d.model} · {d.protocol}
              </div>
            </div>
            <DeviceLocationBadge value={d.locationStatus} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Estado de cada módulo para este ativo — sem inventar dados de módulos ainda não implementados. */
/** Consulta (somente leitura) do que Rotinas e Ocorrências registram para o ativo — os módulos continuam donos dos dados. */
function useModuleUsage(s: Asset360) {
  const access = useAccess();
  const services = useServices();
  return useServiceQuery(async () => {
    const out: { points: { name: string; plan: string }[]; openOccurrences: number; occurrenceSearch: string } = { points: [], openOccurrences: 0, occurrenceSearch: s.asset.tag };
    if (isModuleAvailable(access, 'rotinas')) {
      const catalog = await services.routines.catalog(access);
      out.points = catalog.flatMap((c) => c.points.filter((p) => p.assetId === s.asset.id).map((p) => ({ name: p.name, plan: c.plan.name })));
    }
    if (isModuleAvailable(access, 'ocorrencias')) {
      out.openOccurrences = (await services.occurrences.list(access, { search: s.asset.tag, status: 'abertas', pageSize: 1 })).total;
    }
    return out;
  }, [s.asset.id, access]);
}

function ModulesSection({ s }: { s: Asset360 }) {
  const access = useAccess();
  const usage = useModuleUsage(s).data;
  const others = MODULE_IDS.filter((m) => m !== 'central');
  const describe = (moduleId: ModuleId): { tone: 'green' | 'gray' | 'yellow'; status: string; text: string } => {
    const state = moduleAccess(access, moduleId);
    const module = MODULES[moduleId];
    if (state === 'not-contracted') return { tone: 'yellow', status: 'Não contratado', text: module.valueProposition };
    if (state === 'no-permission') return { tone: 'gray', status: 'Sem permissão', text: 'Seu perfil não acessa este módulo.' };
    if (moduleId === 'security-hub') {
      const sec = s.events.filter((e) => e.securityRelevant);
      return { tone: 'green', status: sec.length ? 'Em uso' : 'Contratado', text: `${sec.length} evento(s) relevante(s) para segurança envolvendo este ativo.` };
    }
    if (moduleId === 'monitor') {
      return {
        tone: 'green',
        status: 'Contratado',
        text: `${s.devices.length} dispositivo(s) associado(s). Comunicação, pontos de dado, regras e alertas técnicos são geridos no Monitor.`,
      };
    }
    if (moduleId === 'rotinas') {
      const points = usage?.points ?? [];
      return {
        tone: 'green',
        status: points.length ? 'Em uso' : 'Contratado',
        text: points.length
          ? `Referenciado por ${points.length} ponto(s) de controle: ${points.map((p) => `${p.name} (${p.plan})`).join('; ')}. O ponto do tipo Ativo usa a identidade da Central (D-007).`
          : 'Nenhum ponto de controle referencia este ativo.',
      };
    }
    if (moduleId === 'ocorrencias') {
      const open = usage?.openOccurrences ?? 0;
      return { tone: 'green', status: open ? 'Em uso' : 'Contratado', text: `${open} ocorrência(s) aberta(s) relacionada(s) a este ativo.` };
    }
    if (moduleId === 'manutencao') {
      return { tone: 'green', status: 'Em uso', text: 'Solicitações e ordens de serviço deste ativo estão na aba Operação, que também permite abrir uma nova solicitação.' };
    }
    return { tone: 'green', status: 'Contratado', text: `Os dados deste ativo em ${module.name} serão exibidos aqui a partir da etapa ${module.buildStage} do protótipo.` };
  };
  return (
    <Panel title="Módulos GRS sobre este ativo" flush>
      {others.map((moduleId) => {
        const d = describe(moduleId);
        const module = MODULES[moduleId];
        return (
          <div key={moduleId} className={styles.moduleRow}>
            <span className={styles.moduleIcon}>
              <Icon name={d.status === 'Não contratado' ? 'lock' : module.icon} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.badges}>
                <strong>{module.name}</strong>
                <Badge tone={d.tone}>{d.status}</Badge>
              </div>
              <p className="helper" style={{ marginTop: 4 }}>
                {d.text}
              </p>
              {moduleId === 'rotinas' && (usage?.points.length ?? 0) > 0 && (
                <ContextLink to="/rotinas/planos" className="helper">
                  Ver planos de rotina
                </ContextLink>
              )}
              {moduleId === 'ocorrencias' && (usage?.openOccurrences ?? 0) > 0 && (
                <ContextLink to={`/ocorrencias/consulta?status=abertas&busca=${encodeURIComponent(s.asset.tag)}`} className="helper">
                  Ver ocorrências abertas do ativo
                </ContextLink>
              )}
              {moduleId === 'security-hub' && isModuleAvailable(access, 'security-hub') && s.events.some((e) => e.securityRelevant) && (
                <p className="helper">Veja a aba Operação para reconhecer alertas.</p>
              )}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function OperationSection({ s }: { s: Asset360 }) {
  const { acknowledge, pending } = useAcknowledge();
  return (
    <Stack>
      <Panel title="Alertas e eventos do ativo" flush>
        {s.events.length === 0 ? (
          <EmptyState compact icon="bell-slash-o" title="Nenhum evento registrado para este ativo." />
        ) : (
          <div className={t.tableWrap}>
            <table className={t.table}>
              <caption className="visually-hidden">Eventos do ativo</caption>
              <thead>
                <tr>
                  <th scope="col">Severidade</th>
                  <th scope="col">Evento</th>
                  <th scope="col">Origem</th>
                  <th scope="col">Ocorrido</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.events.map(({ event, canAcknowledge }) => (
                  <tr key={event.id}>
                    <td>
                      <SeverityBadge value={event.severity} />
                    </td>
                    <td>
                      <ContextLink to={paths.event(event.id)}>{event.title}</ContextLink>
                      <div className="helper">{event.code}</div>
                    </td>
                    <td className="muted">{SOURCE_LABEL[event.source]}</td>
                    <td title={formatDateTime(event.occurredAt)}>{formatRelative(event.occurredAt)}</td>
                    <td>
                      <AlertStatusBadge value={event.status} />
                    </td>
                    <td>
                      {canAcknowledge && (
                        <Button size="small" variant="secondary" icon="check" loading={pending === event.id} onClick={() => acknowledge(event.id, event.title)}>
                          Reconhecer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <AssetMaintenancePanel assetId={s.asset.id} />
    </Stack>
  );
}

function RisksSection() {
  const access = useAccess();
  const state = moduleAccess(access, 'riscos');
  return (
    <Panel title="Riscos">
      <EmptyState
        icon={state === 'not-contracted' ? 'lock' : 'balance-scale'}
        title={state === 'not-contracted' ? 'Gestão de Riscos não contratada' : state === 'no-permission' ? 'Seu perfil não acessa a Gestão de Riscos' : 'Riscos do ativo — etapa 6'}
        text={
          state === 'not-contracted'
            ? `${MODULES.riscos.valueProposition} Nenhum dado de risco é exibido sem a contratação.`
            : state === 'no-permission'
              ? undefined
              : 'A avaliação de riscos e controles deste ativo será exibida quando a Gestão de Riscos for implementada. A metodologia ainda está em definição (Q-01).'
        }
      />
    </Panel>
  );
}

function RelationshipsSection({ s }: { s: Asset360 }) {
  const assetList = (list: { id: string; tag: string; name: string }[], empty: string) =>
    list.length === 0 ? (
      <p className="muted">{empty}</p>
    ) : (
      <ul className={pageStyles.list}>
        {list.map((a) => (
          <li key={a.id} style={{ padding: '2px 0' }}>
            <ContextLink to={paths.asset(a.id)}>{a.tag}</ContextLink> · {a.name}
          </li>
        ))}
      </ul>
    );
  return (
    <Stack>
      <div className={styles.split}>
        <Panel title="Depende de">{assetList(s.dependsOn, 'Nenhuma dependência registrada.')}</Panel>
        <Panel title="Dependem deste ativo">
          {assetList(s.impact.directDependents, 'Nenhum ativo depende diretamente deste.')}
          {s.impact.indirectDependents.length > 0 && (
            <>
              <p className="helper" style={{ margin: '12px 0 4px' }}>
                Dependentes indiretos (cadeia)
              </p>
              {assetList(s.impact.indirectDependents, '')}
            </>
          )}
        </Panel>
      </div>
      <div className={styles.split}>
        <Panel title="Locais atendidos">
          {s.impact.servedLocations.length === 0 ? (
            <p className="muted">O ativo não atende outros locais além da localização principal.</p>
          ) : (
            <ul className={pageStyles.list}>
              {s.impact.servedLocations.map((l) => (
                <li key={l.id} style={{ padding: '2px 0' }}>
                  <ContextLink to={paths.location(l.id)}>{l.name}</ContextLink>
                </li>
              ))}
            </ul>
          )}
          <p className="helper" style={{ marginTop: 8 }}>
            Localização principal (onde o ativo está) é distinta dos locais atendidos (onde presta serviço).
          </p>
        </Panel>
        <Panel title="Grupos" flush>
          {s.groups.length === 0 ? (
            <EmptyState compact icon="object-group" title="O ativo não pertence a nenhum grupo." />
          ) : (
            <ul className={pageStyles.list}>
              {s.groups.map(({ group, viaRules, manual, excepted }) => (
                <li key={group.id} className={pageStyles.listItem}>
                  <div className={pageStyles.listItemMain}>
                    <ContextLink to={centralPaths.group(group.id)} className={pageStyles.listItemTitle}>
                      {group.name}
                    </ContextLink>
                    <div className="helper">{GROUP_CATEGORY_LABEL[group.category]}</div>
                  </div>
                  <span className={styles.badges}>
                    {excepted ? (
                      <Badge tone="yellow" title="Mantido fora do grupo por exceção">
                        Exceção
                      </Badge>
                    ) : (
                      <>
                        {viaRules && <Badge tone="blue">Por regra</Badge>}
                        {manual && <Badge tone="gray">Manual</Badge>}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Stack>
  );
}

function HistorySection({ s }: { s: Asset360 }) {
  const [source, setSource] = useState('');
  const modules = Array.from(new Set(s.history.map((h) => h.moduleId)));
  const items = s.history.filter((h) => !source || h.moduleId === source);
  return (
    <Panel
      title="Histórico"
      flush
      actions={
        <select
          aria-label="Filtrar histórico por módulo"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ minHeight: 28, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
        >
          <option value="">Todos os módulos</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m === 'plataforma' ? 'Plataforma' : MODULES[m].name}
            </option>
          ))}
        </select>
      }
    >
      {items.length === 0 ? (
        <EmptyState compact icon="history" title="Nenhum registro no histórico." />
      ) : (
        <ul className={pageStyles.list}>
          {items.map((h) => (
            <li key={h.id} className={pageStyles.listItem}>
              <div className={pageStyles.listItemMain}>
                <div>{h.summary}</div>
                <div className="helper">
                  {formatDateTime(h.at)} · {h.actorName} · {h.moduleId === 'plataforma' ? 'Plataforma' : MODULES[h.moduleId].name}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
