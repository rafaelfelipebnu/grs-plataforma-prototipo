import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { can, isLocationVisible } from '@/access';
import { Button, PageHeader, Tabs, useToast } from '@/components/ui';
import { LocationPath } from '@/components/domain';
import { LOCATION_LEVEL_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { ReturnBar } from '@/app/navigation/ReturnBar';
import { ALL_SCOPE, CENTRAL_TABS, baseParams, centralPaths, parseCentralParams, type CentralParams } from './centralPaths';
import { LocationTree } from './LocationTree';
import { OverviewTab } from './tabs/OverviewTab';
import { AssetsTab } from './tabs/AssetsTab';
import { DevicesTab } from './tabs/DevicesTab';
import { TelemetryTab } from './tabs/TelemetryTab';
import { GroupsTab } from './tabs/GroupsTab';
import { EventsTab } from './tabs/EventsTab';
import styles from './central.module.css';

export interface CentralTabProps {
  params: CentralParams;
  /** Atualiza a URL preservando o recorte de local. */
  go: (next: CentralParams) => void;
}

/**
 * Home da Central de Ativos e Ambientes (docs/02): árvore permanente de
 * localização + abas. A seleção de local atualiza todas as abas e inclui os
 * descendentes por padrão, com opção "somente este local".
 */
export function CentralHomePage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { activeLocationId, setActiveLocation } = useSession();
  const [searchParams] = useSearchParams();
  const parsed = parseCentralParams(searchParams);
  // Sem local na URL, a Central abre no local contextual do cabeçalho (P-27).
  // "todos" registra a escolha explícita de todo o escopo.
  const requested = parsed.local === ALL_SCOPE ? undefined : parsed.local ?? activeLocationId ?? undefined;
  const locationId = requested && isLocationVisible(access, requested) ? requested : undefined;
  const invalidLocation = Boolean(requested && !locationId);
  const params: CentralParams = { ...parsed, local: locationId };

  const roots = useMemo(() => services.locations.getTree(access), [services, access]);
  const path = locationId ? services.locations.pathOf(access, locationId) : [];
  const current = path[path.length - 1];
  usePageLabel(current ? `Central · ${current.name}` : MODULES.central.name);

  const go = (next: CentralParams) =>
    navigate(centralPaths.home({ ...next, local: next.local ?? ALL_SCOPE }), { replace: true, state: routerLocation.state });

  const selectLocation = (id: string | undefined) =>
    go({ aba: params.aba, local: id, somente: id ? params.somente : undefined });

  const manage = can(access, 'central.manage');

  return (
    <>
      <ReturnBar />
      <PageHeader
        title={MODULES.central.name}
        breadcrumb={[{ label: MODULES.central.name, to: '/central' }, ...(current ? [{ label: current.name }] : [])]}
        description="Cadastro mestre compartilhado de ativos, dispositivos e locais, com classificação, grupos e relacionamentos."
        actions={
          manage ? (
            <>
              <Button variant="secondary" icon="upload" onClick={() => navigate(centralPaths.importAssets)}>
                Importar ativos
              </Button>
              <Button icon="plus" onClick={() => navigate(centralPaths.newAsset(locationId))}>
                Novo ativo
              </Button>
            </>
          ) : undefined
        }
      />
      <div className={styles.layout}>
        <LocationTree roots={roots} selectedId={locationId} onSelect={selectLocation} />
        <div style={{ minWidth: 0 }}>
          <div className={styles.contextBar}>
            <div className={styles.contextBarMain}>
              <h2 className={styles.contextTitle}>{current ? current.name : 'Todo o meu escopo'}</h2>
              <span className="helper">
                {current ? (
                  <>
                    {LOCATION_LEVEL_LABEL[current.level]} · {current.code} · <LocationPath path={path} icon={false} />
                  </>
                ) : (
                  'Todas as localizações às quais você tem acesso.'
                )}
              </span>
              {invalidLocation && <span className="helper">O local solicitado está fora do seu escopo; exibindo todo o escopo.</span>}
            </div>
            {current && (
              <div className={styles.inlineActions}>
                <div className={styles.scopeToggle} role="group" aria-label="Recorte do local">
                  <button type="button" aria-pressed={!params.somente} onClick={() => go({ ...params, somente: false, pagina: 1 })}>
                    Incluir descendentes
                  </button>
                  <button type="button" aria-pressed={Boolean(params.somente)} onClick={() => go({ ...params, somente: true, pagina: 1 })}>
                    Somente este local
                  </button>
                </div>
                <Button
                  variant="link"
                  icon="map-marker"
                  disabled={activeLocationId === current.id}
                  onClick={() => {
                    setActiveLocation(current.id);
                    toast.show({ tone: 'success', title: 'Localização contextual atualizada', message: current.name });
                  }}
                >
                  {activeLocationId === current.id ? 'É a localização contextual' : 'Usar como localização contextual'}
                </Button>
              </div>
            )}
          </div>
          <Tabs
            label="Abas da Central"
            items={CENTRAL_TABS}
            value={params.aba ?? 'visao-geral'}
            onChange={(aba) => go({ ...baseParams(params), aba })}
          />
          <div style={{ marginTop: 16 }}>
            {params.aba === 'ativos' ? (
              <AssetsTab params={params} go={go} />
            ) : params.aba === 'dispositivos' ? (
              <DevicesTab params={params} go={go} />
            ) : params.aba === 'telemetria' ? (
              <TelemetryTab params={params} go={go} />
            ) : params.aba === 'grupos' ? (
              <GroupsTab params={params} go={go} />
            ) : params.aba === 'alertas' ? (
              <EventsTab params={params} go={go} />
            ) : (
              <OverviewTab params={params} go={go} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
