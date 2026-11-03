import { createContext, useContext, type ReactNode } from 'react';
import { isLocationVisible } from '@/access';
import { ErrorState, Icon, IconButton, LoadingState } from '@/components/ui';
import { PERIOD_LABEL, REFRESH_LABEL, type Id, type WidgetConfig, type WidgetInstance } from '@/domain';
import { isServiceError } from '@/services';
import type { QueryState } from '@/app/providers/useServiceQuery';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { WIDGET_CATALOG } from '../catalog';
import styles from '../dashboard.module.css';

/** Controles de edição injetados pelo editor do painel no cabeçalho do widget. */
export const WidgetChromeContext = createContext<{ editing: boolean; chrome?: ReactNode }>({ editing: false });

export interface WidgetProps {
  instance: WidgetInstance;
}

export interface WidgetLocation {
  locationId?: Id;
  label: string;
  /** Local configurado fora do escopo do usuário (padrão do cliente, por exemplo). */
  outOfScope: boolean;
}

/**
 * Local efetivo do widget: o configurado no widget (se estiver no escopo) ou
 * a localização contextual do cabeçalho; sem ambos, todo o escopo.
 */
export function useWidgetLocation(config: WidgetConfig): WidgetLocation {
  const access = useAccess();
  const services = useServices();
  const { activeLocationId } = useSession();
  const nameOf = (id: Id) => services.locations.pathOf(access, id).at(-1)?.name ?? id;
  if (config.locationId) {
    if (isLocationVisible(access, config.locationId)) {
      return { locationId: config.locationId, label: nameOf(config.locationId), outOfScope: false };
    }
    return {
      locationId: activeLocationId ?? undefined,
      label: activeLocationId ? nameOf(activeLocationId) : 'Todo o seu escopo',
      outOfScope: true,
    };
  }
  if (activeLocationId) return { locationId: activeLocationId, label: nameOf(activeLocationId), outOfScope: false };
  return { label: 'Todo o seu escopo', outOfScope: false };
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface WidgetCardProps {
  instance: WidgetInstance;
  location?: WidgetLocation;
  /** Destino do "Ver detalhes" (lista filtrada/contextual). */
  drillTo?: string;
  query?: Pick<QueryState<unknown>, 'updatedAt' | 'reload' | 'loading'>;
  flush?: boolean;
  children: ReactNode;
}

/** Moldura padrão de widget: título, contexto (local/período), atualização e drill-down. */
export function WidgetCard({ instance, location, drillTo, query, flush, children }: WidgetCardProps) {
  const def = WIDGET_CATALOG[instance.type];
  const { editing, chrome } = useContext(WidgetChromeContext);
  const refresh = instance.config.refresh;
  const subtitle = [location?.label, instance.config.period ? PERIOD_LABEL[instance.config.period] : undefined].filter(Boolean).join(' · ');

  return (
    <article className={[styles.widget, editing && styles.widgetEditing].filter(Boolean).join(' ')} aria-label={def.name}>
      <header className={styles.widgetHeader}>
        <Icon name={def.icon} className={styles.widgetIcon} />
        <div className={styles.widgetTitles}>
          <h3 className={styles.widgetTitle} title={def.name}>
            {def.name}
          </h3>
          {subtitle && <div className={styles.widgetSubtitle}>{subtitle}</div>}
        </div>
        {query && (
          <div className={styles.widgetHeaderEnd}>
            <IconButton icon="refresh" label={`Atualizar ${def.name}`} onClick={query.reload} style={{ width: 28, height: 28, fontSize: 13 }} />
          </div>
        )}
      </header>
      {editing && chrome}
      {location?.outOfScope && (
        <div className="helper" style={{ padding: '6px 16px', background: 'var(--sds-yellow-tint)' }}>
          O local configurado está fora do seu escopo; exibindo {location.label.toLowerCase()}.
        </div>
      )}
      <div className={[styles.widgetBody, flush && styles.widgetBodyFlush].filter(Boolean).join(' ')}>{children}</div>
      {(query || drillTo) && (
        <footer className={styles.widgetFooter}>
          <span>
            {query?.updatedAt ? (
              <>
                {refresh === 'tempo-real' || !refresh ? <span className={styles.liveDot} aria-hidden="true" /> : null}
                {refresh ? REFRESH_LABEL[refresh] : REFRESH_LABEL['tempo-real']} · atualizado às {formatClock(query.updatedAt)}
              </>
            ) : query?.loading ? (
              'Carregando dados...'
            ) : null}
          </span>
          {drillTo && !editing && (
            <ContextLink to={drillTo} style={{ fontSize: 12 }}>
              Ver detalhes <Icon name="angle-right" />
            </ContextLink>
          )}
        </footer>
      )}
    </article>
  );
}

/** Estados de carregamento/erro dentro do corpo do widget. */
export function WidgetQueryBody<T>({ query, children }: { query: QueryState<T>; children: (data: T) => ReactNode }) {
  if (query.error) {
    const code = isServiceError(query.error) ? query.error.code : undefined;
    return <ErrorState compact kind={code === 'FORBIDDEN' || code === 'NOT_CONTRACTED' ? 403 : 500} text={query.error.message} />;
  }
  if (query.data === undefined) return <LoadingState compact />;
  return <>{children(query.data)}</>;
}
