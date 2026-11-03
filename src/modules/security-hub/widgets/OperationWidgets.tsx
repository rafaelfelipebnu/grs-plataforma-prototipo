import { useState } from 'react';
import { Badge, Button, EmptyState, Icon, Modal, tableStyles as t } from '@/components/ui';
import { CommunicationBadge, ConditionBadge, CriticalityBadge, SEVERITY_COLOR, SEVERITY_LABEL } from '@/components/domain';
import { LOCATION_LEVEL_LABEL, type Id, type Location } from '@/domain';
import type { LocationStatusRow } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, useContextNavigation } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { hubPaths } from '../hubPaths';
import { WidgetCard, WidgetQueryBody, useWidgetLocation, type WidgetProps } from './WidgetCard';
import styles from '../dashboard.module.css';

const tail = (path: { name: string }[], n = 2) => path.slice(-n).map((l) => l.name).join(' › ');

/** Neutro: distinto do verde (severidade baixa) para não gerar ambiguidade. */
const NO_ALERT_COLOR = 'var(--sds-secondary)';

function tileColor(row: LocationStatusRow): string {
  if (row.maxSeverity) return SEVERITY_COLOR[row.maxSeverity];
  return row.assetsNotNormal > 0 ? 'var(--sds-yellow)' : NO_ALERT_COLOR;
}

function tileSummary(row: LocationStatusRow): string {
  const parts: string[] = [];
  parts.push(row.activeAlerts === 0 ? 'Sem alertas ativos' : `${row.activeAlerts} ${row.activeAlerts === 1 ? 'alerta ativo' : 'alertas ativos'}`);
  if (row.assetsNotNormal > 0) parts.push(`${row.assetsNotNormal} ${row.assetsNotNormal === 1 ? 'ativo fora do normal' : 'ativos fora do normal'}`);
  return parts.join(' · ');
}

/**
 * Sem foco: cada raiz do escopo é um bloco. Com foco: um único bloco para o
 * local em foco, com os filhos como peças (evita repetir o local como bloco e peça).
 */
function blocksFor(rows: LocationStatusRow[], focus: Id | undefined, focusLocation: Location | undefined): LocationStatusRow[] {
  if (!focus || !focusLocation) return rows;
  if (rows.length === 1 && rows[0]!.location.id === focus) return rows;
  const maxSeverity = rows.reduce<LocationStatusRow['maxSeverity']>(
    (max, r) => (r.maxSeverity && (!max || SEVERITY_ORDER.indexOf(r.maxSeverity) < SEVERITY_ORDER.indexOf(max)) ? r.maxSeverity : max),
    undefined,
  );
  return [
    {
      location: focusLocation,
      activeAlerts: rows.reduce((s, r) => s + r.activeAlerts, 0),
      criticalAlerts: rows.reduce((s, r) => s + r.criticalAlerts, 0),
      assetsNotNormal: rows.reduce((s, r) => s + r.assetsNotNormal, 0),
      maxSeverity,
      children: rows,
    },
  ];
}

const SEVERITY_ORDER = ['critica', 'alta', 'media', 'baixa', 'informativa'] as const;

/**
 * Mapa esquemático (não há planta real nesta demonstração): cada bloco é uma
 * localização; as peças internas são os locais filhos, coloridos pela maior
 * severidade de alerta ativo.
 */
function SchematicMap({ rootLocationId, allowZoom }: { rootLocationId?: Id; allowZoom: boolean }) {
  const access = useAccess();
  const services = useServices();
  const { navigateWithContext } = useContextNavigation();
  const [focus, setFocus] = useState<Id | undefined>(rootLocationId);
  const query = useServiceQuery(() => services.hub.locationStatus(access, { locationId: focus }), [access, focus]);
  const focusPath = focus ? services.locations.pathOf(access, focus) : [];

  const openTile = (row: LocationStatusRow) => {
    if (allowZoom && row.children.length > 0) setFocus(row.location.id);
    else navigateWithContext(hubPaths.events({ status: 'ativo', local: row.location.id }));
  };

  return (
    <div className={styles.map}>
      {allowZoom && (
        <div className="helper" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <Button variant="link" size="small" onClick={() => setFocus(rootLocationId)} disabled={focus === rootLocationId} style={{ paddingLeft: 0 }}>
            Visão inicial
          </Button>
          {focusPath.map((l) => (
            <span key={l.id}>
              › <button type="button" onClick={() => setFocus(l.id)} style={{ border: 0, background: 'none', color: 'var(--sds-primary)', cursor: 'pointer', padding: 0 }}>{l.name}</button>
            </span>
          ))}
        </div>
      )}
      <WidgetQueryBody query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState compact icon="map-o" title="Nenhuma localização neste recorte." />
          ) : (
            <>
              {blocksFor(rows, focus, focusPath.at(-1)).map((row) => (
                <section key={row.location.id} className={styles.mapUnit} aria-label={row.location.name}>
                  <div className={styles.mapUnitHeader}>
                    <span className={styles.severityDot} style={{ background: tileColor(row) }} />
                    <span>{row.location.name}</span>
                    <span className="helper" style={{ fontWeight: 400 }}>
                      {LOCATION_LEVEL_LABEL[row.location.level]} · {tileSummary(row)}
                    </span>
                  </div>
                  <div className={styles.mapTiles}>
                    {(row.children.length > 0 ? row.children : [row]).map((child) => (
                      <button
                        key={child.location.id}
                        type="button"
                        className={styles.mapTile}
                        style={{ borderLeftColor: tileColor(child) }}
                        onClick={() => openTile(child)}
                        title={allowZoom && child.children.length > 0 ? `Aproximar em ${child.location.name}` : `Ver alertas de ${child.location.name}`}
                      >
                        <span className={styles.mapTileName}>{child.location.name}</span>
                        <span className={styles.mapTileMeta}>{tileSummary(child)}</span>
                        {child.maxSeverity && <span className={styles.mapTileMeta}>Maior severidade: {SEVERITY_LABEL[child.maxSeverity]}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <div className={styles.mapLegend} aria-label="Legenda">
                {(['critica', 'alta', 'media', 'baixa'] as const).map((s) => (
                  <span key={s}>
                    <span className={styles.severityDot} style={{ background: SEVERITY_COLOR[s] }} /> Alerta {SEVERITY_LABEL[s].toLowerCase()}
                  </span>
                ))}
                <span>
                  <span className={styles.severityDot} style={{ background: NO_ALERT_COLOR }} /> Sem alertas
                </span>
                <span>Mapa esquemático de demonstração</span>
              </div>
            </>
          )
        }
      </WidgetQueryBody>
    </div>
  );
}

export function MapWidget({ instance }: WidgetProps) {
  const location = useWidgetLocation(instance.config);
  const [expanded, setExpanded] = useState(false);
  return (
    <WidgetCard instance={instance} location={location} drillTo={hubPaths.events({ status: 'ativo', local: location.locationId })}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 8 }}>
        <Button variant="link" size="small" icon="expand" onClick={() => setExpanded(true)}>
          Expandir mapa
        </Button>
      </div>
      <SchematicMap key={location.locationId ?? 'escopo'} rootLocationId={location.locationId} allowZoom={false} />
      <Modal open={expanded} onClose={() => setExpanded(false)} title="Mapa operacional" size="large">
        <p className="helper" style={{ marginBottom: 12 }}>
          Selecione um bloco para aproximar; nos locais sem subdivisões, abre a lista de alertas ativos.
        </p>
        <SchematicMap rootLocationId={location.locationId} allowZoom />
      </Modal>
    </WidgetCard>
  );
}

export function LocationStatusWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const query = useServiceQuery(() => services.hub.locationStatus(access, { locationId: location.locationId }), [access, location.locationId], { refresh: config.refresh });
  return (
    <WidgetCard instance={instance} location={location} query={query} flush>
      <WidgetQueryBody query={query}>
        {(rows) => (
          <div className={t.tableWrap}>
            <table className={t.table}>
              <caption className="visually-hidden">Situação por localização</caption>
              <thead>
                <tr>
                  <th scope="col">Local</th>
                  <th scope="col" title="Alertas de segurança ativos">Alertas</th>
                  <th scope="col" title="Ativos relevantes para segurança fora da condição normal">Ativos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.location.id}>
                    <td>
                      <span className={styles.severityDot} style={{ background: tileColor(row), display: 'inline-block', marginRight: 6 }} />
                      <ContextLink to={hubPaths.events({ status: 'ativo', local: row.location.id })}>{row.location.name}</ContextLink>
                    </td>
                    <td>
                      {row.activeAlerts}
                      {row.criticalAlerts > 0 && (
                        <>
                          {' '}
                          <Badge tone="red">{row.criticalAlerts} crít.</Badge>
                        </>
                      )}
                    </td>
                    <td>{row.assetsNotNormal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}

export function CriticalAssetsWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const query = useServiceQuery(
    () => services.hub.criticalAssets(access, { locationId: location.locationId, minCriticality: config.minCriticality, limit: config.limit ?? 6 }),
    [access, location.locationId, config.minCriticality, config.limit],
    { refresh: config.refresh },
  );
  return (
    <WidgetCard instance={instance} location={location} query={query} flush>
      <WidgetQueryBody query={query}>
        {(assets) =>
          assets.length === 0 ? (
            <EmptyState compact icon="cubes" title="Nenhum ativo crítico relevante para a segurança neste recorte." />
          ) : (
            <ul className={styles.rows}>
              {assets.map((v) => (
                <li key={v.asset.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <ContextLink to={paths.asset(v.asset.id)} className={styles.rowTitle}>
                      {v.asset.tag} · {v.asset.name}
                    </ContextLink>
                    <div className={styles.rowMeta}>
                      {tail(v.locationPath)}
                      {v.securityDependents.length > 0 && ` · Sustenta ${v.securityDependents.map((d) => d.tag).join(', ')}`}
                      {v.activeEvents > 0 && ` · ${v.activeEvents} alerta(s) ativo(s)`}
                    </div>
                  </div>
                  <div className={styles.rowEnd}>
                    <CriticalityBadge value={v.asset.criticality} />
                    <ConditionBadge value={v.asset.condition} />
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </WidgetQueryBody>
    </WidgetCard>
  );
}

export function InfraHealthWidget({ instance }: WidgetProps) {
  const { config } = instance;
  const access = useAccess();
  const services = useServices();
  const location = useWidgetLocation(config);
  const query = useServiceQuery(() => services.hub.infrastructureHealth(access, { locationId: location.locationId, limit: config.limit ?? 5 }), [access, location.locationId, config.limit], {
    refresh: config.refresh,
  });
  return (
    <WidgetCard instance={instance} location={location} query={query} flush>
      <WidgetQueryBody query={query}>
        {(h) => (
          <>
            <div className={styles.counters}>
              <Badge tone="green" icon="wifi">{h.online} online</Badge>
              <Badge tone="yellow" icon="wifi">{h.instavel} instáveis</Badge>
              <Badge tone="red" icon="wifi">{h.offline} offline</Badge>
            </div>
            {h.attention.length === 0 ? (
              <EmptyState compact icon="heartbeat" title="Todos os dispositivos de segurança comunicando." />
            ) : (
              <ul className={styles.rows}>
                {h.attention.map(({ device, health, asset, locationPath }) => (
                  <li key={device.id} className={styles.row}>
                    <Icon name="microchip" className="muted" />
                    <div className={styles.rowMain}>
                      <ContextLink to={paths.device(device.id)} className={styles.rowTitle}>
                        {device.name}
                      </ContextLink>
                      <div className={styles.rowMeta}>
                        {asset ? `${asset.tag} · ` : ''}
                        {tail(locationPath)}
                      </div>
                    </div>
                    <CommunicationBadge value={health.communication} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </WidgetQueryBody>
    </WidgetCard>
  );
}
