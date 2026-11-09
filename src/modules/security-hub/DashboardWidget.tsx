import { useMemo, type DragEvent } from 'react';
import { moduleAccess } from '@/access';
import { EmptyState, Icon, IconButton } from '@/components/ui';
import { DASHBOARD_AREAS, DASHBOARD_AREA_LABEL, WIDGET_SIZE_LABEL, type DashboardArea, type WidgetInstance, type WidgetSize } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { WIDGET_CATALOG } from './catalog';
import { WidgetCard, WidgetChromeContext } from './widgets/WidgetCard';
import { WIDGET_COMPONENTS } from './widgets/registry';
import styles from './dashboard.module.css';

export type WidgetVisibility = 'visible' | 'hidden-no-permission';

/** Widget com módulo necessário sem permissão no perfil fica oculto no modo de visualização. */
export function useWidgetVisibility(instance: WidgetInstance): WidgetVisibility {
  const access = useAccess();
  const def = WIDGET_CATALOG[instance.type];
  return def.requiredModules.some((m) => moduleAccess(access, m) === 'no-permission') ? 'hidden-no-permission' : 'visible';
}

export interface EditHandlers {
  dragging: string | null;
  dropTarget: { id: string; position: 'before' | 'after' } | null;
  onDragStart: (id: string) => void;
  onDragOverWidget: (id: string, position: 'before' | 'after') => void;
  onDropOnWidget: (id: string) => void;
  onDragEnd: () => void;
  onShift: (id: string, delta: -1 | 1) => void;
  onArea: (id: string, area: DashboardArea) => void;
  onSize: (id: string, size: WidgetSize) => void;
  onConfigure: (id: string) => void;
  onRemove: (id: string) => void;
}

interface Props {
  instance: WidgetInstance;
  /** Modo de edição com controles (falso em pré-visualização). */
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  handlers?: EditHandlers;
}

const SPAN_CLASS: Record<WidgetSize, string> = { 3: styles.span3!, 4: styles.span4!, 6: styles.span6!, 8: styles.span8!, 12: styles.span12! };

/**
 * Renderiza um widget aplicando:
 * - permissão (sem permissão: oculto na visualização);
 * - contrato (módulo não contratado: bloqueado, sem dados);
 * - controles de edição (arrastar, mover, área, tamanho, configurar, remover).
 */
export function DashboardWidget({ instance, editing, isFirst, isLast, handlers }: Props) {
  const access = useAccess();
  const def = WIDGET_CATALOG[instance.type];
  const visibility = useWidgetVisibility(instance);
  const locked = def.requiredModules.find((m) => moduleAccess(access, m) === 'not-contracted');

  const chrome = useMemo(() => {
    if (!editing || !handlers) return undefined;
    return (
      <div className={styles.chrome}>
        <span className={styles.dragHandle} title="Arraste para mover" aria-hidden="true">
          <Icon name="arrows" />
        </span>
        <IconButton icon="arrow-left" label={`Mover ${def.name} para antes`} disabled={isFirst} onClick={() => handlers.onShift(instance.id, -1)} style={{ width: 28, height: 28, fontSize: 12 }} />
        <IconButton icon="arrow-right" label={`Mover ${def.name} para depois`} disabled={isLast} onClick={() => handlers.onShift(instance.id, 1)} style={{ width: 28, height: 28, fontSize: 12 }} />
        <select
          className={styles.chromeSelect}
          aria-label={`Área de ${def.name}`}
          value={instance.area}
          onChange={(e) => handlers.onArea(instance.id, e.target.value as DashboardArea)}
        >
          {DASHBOARD_AREAS.map((a) => (
            <option key={a} value={a}>
              {DASHBOARD_AREA_LABEL[a]}
            </option>
          ))}
        </select>
        <select
          className={styles.chromeSelect}
          aria-label={`Tamanho de ${def.name}`}
          value={instance.size}
          onChange={(e) => handlers.onSize(instance.id, Number(e.target.value) as WidgetSize)}
        >
          {def.allowedSizes.map((s) => (
            <option key={s} value={s}>
              {WIDGET_SIZE_LABEL[s]}
            </option>
          ))}
        </select>
        <span className={styles.chromeSpacer} />
        <IconButton icon="cog" label={`Configurar ${def.name}`} onClick={() => handlers.onConfigure(instance.id)} style={{ width: 28, height: 28, fontSize: 13 }} />
        <IconButton icon="trash-o" label={`Remover ${def.name}`} onClick={() => handlers.onRemove(instance.id)} style={{ width: 28, height: 28, fontSize: 13 }} />
      </div>
    );
  }, [editing, handlers, def, instance, isFirst, isLast]);

  if (visibility === 'hidden-no-permission' && !editing) return null;

  const Component = WIDGET_COMPONENTS[instance.type];
  let body;
  if (visibility === 'hidden-no-permission') {
    body = (
      <WidgetCard instance={instance}>
        <EmptyState compact icon="eye-slash" title="Oculto para o seu perfil" text="Usuários sem permissão no módulo de origem não veem este widget." />
      </WidgetCard>
    );
  } else if (locked) {
    body = (
      <WidgetCard instance={instance}>
        <EmptyState
          compact
          icon="lock"
          title={`${MODULES[locked].name} não contratado`}
          text={
            <>
              {MODULES[locked].valueProposition} <ContextLink to={MODULES[locked].basePath}>Saiba mais</ContextLink>
            </>
          }
        />
      </WidgetCard>
    );
  } else {
    body = <Component instance={instance} />;
  }

  const dragProps =
    editing && handlers
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', instance.id);
            handlers.onDragStart(instance.id);
          },
          onDragOver: (e: DragEvent<HTMLDivElement>) => {
            if (!handlers.dragging || handlers.dragging === instance.id) return;
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            handlers.onDragOverWidget(instance.id, e.clientX < rect.left + rect.width / 2 ? 'before' : 'after');
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            handlers.onDropOnWidget(instance.id);
          },
          onDragEnd: handlers.onDragEnd,
        }
      : {};

  const drop = handlers?.dropTarget?.id === instance.id ? handlers.dropTarget.position : null;
  return (
    <div
      className={[
        SPAN_CLASS[instance.size],
        handlers?.dragging === instance.id && styles.widgetDragging,
        drop === 'before' && styles.widgetDropBefore,
        drop === 'after' && styles.widgetDropAfter,
      ]
        .filter(Boolean)
        .join(' ')}
      data-widget-id={instance.id}
      {...dragProps}
    >
      <WidgetChromeContext.Provider value={{ editing, chrome }}>{body}</WidgetChromeContext.Provider>
    </div>
  );
}
