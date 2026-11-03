import { useState } from 'react';
import { locationOptionLabel, useLocationOptions } from '@/app/hooks/useLocationOptions';
import { isModuleAvailable } from '@/access';
import { Badge, Button, Chip, EmptyState, ErrorState, LoadingState, SelectField, SidePanel, Tabs, useToast } from '@/components/ui';
import { LocationPath, SEVERITY_COLOR, SEVERITY_LABEL, formatRelative } from '@/components/domain';
import { NOTIFICATION_TYPE_LABEL, type ModuleId, type NotificationType } from '@/domain';
import { MODULES, MODULE_ORDER } from '@/modules/registry';
import type { NotificationCategory, NotificationFilter, NotificationView } from '@/services';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { resolveTargetPath } from '@/app/navigation/targets';
import { useContextNavigation } from '@/app/navigation/contextNavigation';
import styles from './Shell.module.css';

interface Filters {
  moduleId: ModuleId | '';
  type: NotificationType | '';
  locationId: string;
  readStatus: 'lida' | 'nao-lida' | '';
}

const EMPTY_FILTERS: Filters = { moduleId: '', type: '', locationId: '', readStatus: '' };

/**
 * Central de notificações compartilhada entre módulos. Ler uma notificação
 * NÃO reconhece nem resolve o evento operacional — isso acontece no módulo.
 */
export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const { activeLocationId } = useSession();
  const { navigateWithContext } = useContextNavigation();
  const [category, setCategory] = useState<NotificationCategory>('nao-lidas');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const filter: NotificationFilter = {
    category,
    moduleId: filters.moduleId || undefined,
    type: filters.type || undefined,
    locationId: filters.locationId || undefined,
    readStatus: filters.readStatus || undefined,
  };

  const list = useServiceQuery(
    () => (open ? services.notifications.list(access, filter) : Promise.resolve([])),
    [open, access, category, filters.moduleId, filters.type, filters.locationId, filters.readStatus],
  );
  const counts = useServiceQuery(
    async () => {
      if (!open) return { unread: 0, all: 0, important: 0 };
      const [all, important] = await Promise.all([
        services.notifications.list(access, { category: 'todas' }),
        services.notifications.list(access, { category: 'importantes' }),
      ]);
      return { unread: all.filter((n) => !n.read).length, all: all.length, important: important.length };
    },
    [open, access],
  );

  const moduleOptions = MODULE_ORDER.filter((m) => isModuleAvailable(access, m.id)).map((m) => ({ value: m.id, label: m.name }));
  const typeOptions = (Object.keys(NOTIFICATION_TYPE_LABEL) as NotificationType[]).map((t) => ({ value: t, label: NOTIFICATION_TYPE_LABEL[t] }));
  const locationOptions = useLocationOptions(1);

  const activeChips: { key: keyof Filters; label: string; value: string }[] = [];
  if (filters.moduleId) activeChips.push({ key: 'moduleId', label: 'Módulo', value: MODULES[filters.moduleId].name });
  if (filters.type) activeChips.push({ key: 'type', label: 'Tipo', value: NOTIFICATION_TYPE_LABEL[filters.type] });
  if (filters.locationId)
    activeChips.push({ key: 'locationId', label: 'Local', value: locationOptionLabel(locationOptions, filters.locationId) });
  if (filters.readStatus) activeChips.push({ key: 'readStatus', label: 'Status', value: filters.readStatus === 'lida' ? 'Lida' : 'Não lida' });

  const openNotification = async (view: NotificationView) => {
    const path = resolveTargetPath(view.notification.target, access, services);
    if (!view.read) await services.notifications.markRead(access, view.notification.id);
    if (!path) {
      toast.show({ tone: 'warning', title: 'Destino indisponível', message: 'Você não tem acesso ao contexto desta notificação.' });
      return;
    }
    onClose();
    navigateWithContext(path);
  };

  const markRead = async (view: NotificationView) => {
    await services.notifications.markRead(access, view.notification.id);
    toast.show({ tone: 'success', title: 'Notificação marcada como lida' });
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      const count = await services.notifications.markAllRead(access, filter);
      toast.show({
        tone: count > 0 ? 'success' : 'info',
        title: count > 0 ? `${count} notificações marcadas como lidas` : 'Não há notificações não lidas neste filtro',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Notificações"
      wide
      footerStart={<span className="helper">Ler a notificação não reconhece o alerta no módulo.</span>}
      footerEnd={
        <Button variant="secondary" icon="check" onClick={markAll} loading={markingAll}>
          Marcar todas como lidas
        </Button>
      }
    >
      <div className={styles.notifToolbar}>
        <Tabs
          label="Categorias de notificação"
          value={category}
          onChange={setCategory}
          items={[
            { id: 'nao-lidas', label: 'Não lidas', count: counts.data?.unread },
            { id: 'todas', label: 'Todas', count: counts.data?.all },
            { id: 'importantes', label: 'Importantes', count: counts.data?.important },
          ]}
        />
      </div>
      <div className={styles.notifFilterToggle}>
        <div className={styles.notifChips}>
          {activeChips.length === 0 ? (
            <span className="helper">Sem filtros aplicados</span>
          ) : (
            activeChips.map((c) => (
              <Chip key={c.key} label={c.label} value={c.value} onRemove={() => setFilters((f) => ({ ...f, [c.key]: '' }))} />
            ))
          )}
        </div>
        <Button variant="link" size="small" icon={showFilters ? 'minus' : 'filter'} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          {showFilters ? 'Ocultar filtros' : 'Filtros'}
        </Button>
      </div>
      {showFilters && (
        <div className={styles.notifFilters}>
          <SelectField label="Módulo" emptyLabel="Todos" options={moduleOptions} value={filters.moduleId} onChange={(e) => setFilters((f) => ({ ...f, moduleId: e.target.value as ModuleId | '' }))} />
          <SelectField label="Tipo" emptyLabel="Todos" options={typeOptions} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as NotificationType | '' }))} />
          <SelectField
            label="Local"
            emptyLabel="Todos"
            options={locationOptions}
            value={filters.locationId}
            onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
            helper={activeLocationId ? undefined : 'Inclui os locais descendentes.'}
          />
          <SelectField
            label="Status"
            emptyLabel="Todos"
            options={[
              { value: 'nao-lida', label: 'Não lida' },
              { value: 'lida', label: 'Lida' },
            ]}
            value={filters.readStatus}
            onChange={(e) => setFilters((f) => ({ ...f, readStatus: e.target.value as Filters['readStatus'] }))}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Button variant="link" size="small" icon="eraser" onClick={() => setFilters(EMPTY_FILTERS)} style={{ paddingLeft: 0 }}>
              Limpar filtros
            </Button>
          </div>
        </div>
      )}

      {list.loading && !list.data ? (
        <LoadingState compact />
      ) : list.error ? (
        <ErrorState kind={500} compact text={list.error.message} />
      ) : list.data && list.data.length === 0 ? (
        <EmptyState
          compact
          icon="bell-slash-o"
          title={category === 'nao-lidas' ? 'Tudo em dia: não há notificações não lidas.' : 'Nenhum resultado encontrado para sua busca.'}
        />
      ) : (
        <ul className={styles.notifList} aria-label="Lista de notificações">
          {list.data?.map((view) => {
            const n = view.notification;
            return (
              <li key={n.id} className={[styles.notifItem, !view.read && styles.notifItemUnread].filter(Boolean).join(' ')}>
                <span className={styles.notifSeverity} style={{ background: SEVERITY_COLOR[n.severity] }} title={`Severidade ${SEVERITY_LABEL[n.severity].toLowerCase()}`} />
                <div className={styles.notifBody}>
                  <button type="button" className={styles.notifTitleButton} onClick={() => openNotification(view)}>
                    <span className={styles.notifTitle}>
                      {n.title}
                      {!view.read && <span className="visually-hidden"> (não lida)</span>}
                    </span>
                    <span className={styles.notifMessage} style={{ display: 'block' }}>
                      {n.message}
                    </span>
                  </button>
                  <div className={styles.notifMeta}>
                    <span>{MODULES[n.moduleId].name}</span>
                    <span>{NOTIFICATION_TYPE_LABEL[n.type]}</span>
                    {view.locationPath.length > 0 && <LocationPath path={view.locationPath} tail={2} />}
                    <span title={n.createdAt}>{formatRelative(n.createdAt)}</span>
                    {n.important && <Badge tone="blue" icon="star">Importante</Badge>}
                    {view.linkedEventStatus === 'ativo' && (
                      <Badge tone="orange" icon="bell" title="O alerta precisa ser reconhecido no módulo">
                        Alerta ativo
                      </Badge>
                    )}
                    {view.linkedEventStatus === 'reconhecido' && <Badge tone="gray" icon="check">Alerta reconhecido</Badge>}
                  </div>
                  <div className={styles.notifActions}>
                    <Button variant="link" size="small" icon="external-link" onClick={() => openNotification(view)} style={{ paddingLeft: 0 }}>
                      Abrir contexto
                    </Button>
                    {!view.read && (
                      <Button variant="link" size="small" icon="check" onClick={() => markRead(view)}>
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SidePanel>
  );
}
