import { useMemo, useState } from 'react';
import { can } from '@/access';
import { Button, ConfirmDialog, EmptyState, PageHeader, Panel, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import { DASHBOARD_AREAS, DASHBOARD_AREA_LABEL, type DashboardArea, type WidgetInstance, type WidgetTypeId } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useDataVersion, useServices } from '@/app/providers/ServicesProvider';
import { useUnsavedChangesGuard } from '@/app/hooks/useUnsavedChangesGuard';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { WIDGET_CATALOG } from './catalog';
import { DashboardWidget, type EditHandlers } from './DashboardWidget';
import { hubPaths } from './hubPaths';
import { createWidget, moveWidget, removeWidget, sameLayout, shiftWidget, updateWidget } from './layoutOps';
import { WidgetCatalogModal } from './WidgetCatalogModal';
import { WidgetConfigModal } from './WidgetConfigModal';
import styles from './dashboard.module.css';

type EditTarget = 'mine' | 'default';

interface EditState {
  target: EditTarget;
  original: WidgetInstance[];
  draft: WidgetInstance[];
  preview: boolean;
}

/**
 * Dashboard configurável do Security Hub (docs/03): quatro áreas, catálogo de
 * 17 widgets, padrão do cliente e painel pessoal, modo de edição completo.
 */
export function DashboardPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  useDataVersion();
  usePageLabel('Security Hub');

  const view = services.dashboards.get(access);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'cancel' | 'reset'>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EditHandlers['dropTarget']>(null);
  const [dropArea, setDropArea] = useState<DashboardArea | null>(null);

  const widgets = edit ? edit.draft : view.layout.widgets;
  const dirty = Boolean(edit && !sameLayout(edit.draft, edit.original));
  const guardDialog = useUnsavedChangesGuard(dirty, 'Há alterações não salvas no painel. Deseja sair e descartá-las?');
  const canEditDefault = can(access, 'hub.dashboard.default');
  const editingChrome = Boolean(edit && !edit.preview);

  const setDraft = (fn: (list: WidgetInstance[]) => WidgetInstance[]) => setEdit((e) => (e ? { ...e, draft: fn(e.draft) } : e));

  const start = (target: EditTarget) => {
    const source = target === 'default' ? services.dashboards.getClientDefault(access).widgets : view.layout.widgets;
    setEdit({ target, original: structuredClone(source), draft: structuredClone(source), preview: false });
  };

  const finishDrag = () => {
    setDragging(null);
    setDropTarget(null);
    setDropArea(null);
  };

  const handlers: EditHandlers = useMemo(
    () => ({
      dragging,
      dropTarget,
      onDragStart: (id) => setDragging(id),
      onDragOverWidget: (id, position) => {
        setDropArea(null);
        setDropTarget((cur) => (cur?.id === id && cur.position === position ? cur : { id, position }));
      },
      onDropOnWidget: (targetId) => {
        if (dragging && dropTarget && dragging !== targetId) {
          setDraft((list) => {
            const target = list.find((w) => w.id === targetId)!;
            const areaItems = list.filter((w) => w.area === target.area && w.id !== dragging);
            const index = areaItems.indexOf(target) + (dropTarget.position === 'after' ? 1 : 0);
            return moveWidget(list, dragging, target.area, index);
          });
        }
        finishDrag();
      },
      onDragEnd: finishDrag,
      onShift: (id, delta) => setDraft((list) => shiftWidget(list, id, delta)),
      onArea: (id, area) => setDraft((list) => moveWidget(list, id, area, Number.MAX_SAFE_INTEGER)),
      onSize: (id, size) => setDraft((list) => updateWidget(list, id, { size })),
      onConfigure: (id) => setConfigId(id),
      onRemove: (id) => setDraft((list) => removeWidget(list, id)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragging, dropTarget],
  );

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      if (edit.target === 'default') {
        await services.dashboards.saveClientDefault(access, edit.draft);
        toast.show({ tone: 'success', title: 'Painel padrão do cliente salvo', message: 'Vale para os usuários que ainda não personalizaram.' });
      } else {
        await services.dashboards.saveMine(access, edit.draft);
        toast.show({ tone: 'success', title: 'Seu painel foi salvo' });
      }
      setEdit(null);
    } catch (error) {
      toast.show({ tone: 'error', title: 'Não foi possível salvar o painel', message: isServiceError(error) ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const resetMine = async () => {
    setConfirm(null);
    await services.dashboards.resetMine(access);
    toast.show({ tone: 'success', title: 'Painel padrão do cliente restaurado' });
  };

  const addWidget = (type: WidgetTypeId, area: DashboardArea | undefined) => {
    const created = createWidget(type, area);
    setDraft((list) => [...list, created]);
    toast.show({ tone: 'success', title: `${WIDGET_CATALOG[type].name} adicionado`, message: 'Salve para manter a alteração.' });
  };

  const personalizedOthers = services.dashboards.personalizedCount(access);
  const configInstance = edit?.draft.find((w) => w.id === configId) ?? null;

  return (
    <>
      <PageHeader
        title="Security Hub"
        breadcrumb={[{ label: 'Security Hub' }]}
        description={
          edit
            ? undefined
            : view.source === 'pessoal'
              ? `Meu painel personalizado · atualizado em ${formatDateTime(view.layout.updatedAt)}`
              : 'Painel padrão do cliente'
        }
        actions={
          edit ? undefined : (
            <>
              <ContextLink to={hubPaths.events({ status: 'ativo', ordem: 'severidade' })} style={{ alignSelf: 'center', marginRight: 8 }}>
                Todos os alertas
              </ContextLink>
              {view.source === 'pessoal' && (
                <Button variant="link" icon="undo" onClick={() => setConfirm('reset')}>
                  Restaurar padrão do cliente
                </Button>
              )}
              {canEditDefault && (
                <Button variant="secondary" icon="users" onClick={() => start('default')}>
                  Editar padrão do cliente
                </Button>
              )}
              <Button variant="secondary" icon="pencil" onClick={() => start('mine')}>
                Personalizar painel
              </Button>
            </>
          )
        }
      />

      {edit && (
        <div className={styles.editBar} role="region" aria-label="Edição do painel">
          <div className={styles.editBarText}>
            <div className={styles.editBarTitle}>{edit.target === 'default' ? 'Editando o painel padrão do cliente' : 'Editando meu painel'}</div>
            <div className="helper" style={{ color: 'var(--sds-text-support)' }}>
              {edit.target === 'default'
                ? `Vale para quem ainda não personalizou. ${personalizedOthers} usuário(s) com painel pessoal não serão afetados.`
                : 'As alterações valem somente para você. Arraste os widgets ou use os controles de cada um.'}
              {dirty ? ' · Alterações não salvas.' : ''}
            </div>
          </div>
          <div className={styles.editBarActions}>
            <Button variant="secondary" icon="plus" onClick={() => setCatalogOpen(true)}>
              Adicionar widget
            </Button>
            <Button variant="link" icon={edit.preview ? 'pencil' : 'eye'} onClick={() => setEdit((e) => (e ? { ...e, preview: !e.preview } : e))} aria-pressed={edit.preview}>
              {edit.preview ? 'Voltar à edição' : 'Pré-visualizar'}
            </Button>
            <Button variant="link" onClick={() => (dirty ? setConfirm('cancel') : setEdit(null))}>
              Cancelar
            </Button>
            <Button icon="check" onClick={save} loading={saving} disabled={!dirty}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {widgets.length === 0 ? (
        <Panel title="Painel">
          <EmptyState
            icon="th-large"
            title="Seu painel está vazio."
            text="Adicione widgets do catálogo para acompanhar a segurança das suas localizações."
            actions={
              <Button
                icon="plus"
                onClick={() => {
                  if (!edit) start('mine');
                  setCatalogOpen(true);
                }}
              >
                Adicionar widget
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className={styles.areas}>
          {DASHBOARD_AREAS.map((area) => {
            const items = widgets.filter((w) => w.area === area);
            if (!edit && items.length === 0) return null;
            return (
              <section key={area} className={styles.area} aria-labelledby={`area-${area}`}>
                <div className={styles.areaHeader}>
                  <h2 id={`area-${area}`} className={styles.areaTitle}>
                    {DASHBOARD_AREA_LABEL[area]}
                  </h2>
                </div>
                <div className={styles.grid}>
                  {items.map((w, i) => (
                    <DashboardWidget
                      key={w.id}
                      instance={w}
                      editing={editingChrome}
                      isFirst={i === 0}
                      isLast={i === items.length - 1}
                      handlers={editingChrome ? handlers : undefined}
                    />
                  ))}
                  {editingChrome && (
                    <div
                      className={[styles.dropZone, dropArea === area && styles.dropZoneActive].filter(Boolean).join(' ')}
                      onDragOver={(e) => {
                        if (!dragging) return;
                        e.preventDefault();
                        setDropTarget(null);
                        setDropArea(area);
                      }}
                      onDragLeave={() => setDropArea((a) => (a === area ? null : a))}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragging) setDraft((list) => moveWidget(list, dragging, area, Number.MAX_SAFE_INTEGER));
                        finishDrag();
                      }}
                    >
                      {items.length === 0 ? 'Área vazia: arraste widgets para cá ou use “Adicionar widget”.' : 'Solte aqui para mover ao fim desta área.'}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <WidgetCatalogModal open={catalogOpen} onClose={() => setCatalogOpen(false)} current={widgets} onAdd={addWidget} />
      <WidgetConfigModal
        instance={configInstance}
        onClose={() => setConfigId(null)}
        onApply={(id, patch) => {
          setDraft((list) => {
            const current = list.find((w) => w.id === id);
            const moved = current && current.area !== patch.area ? moveWidget(list, id, patch.area, Number.MAX_SAFE_INTEGER) : list;
            return updateWidget(moved, id, patch);
          });
        }}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Descartar alterações"
        message="As alterações feitas no painel serão descartadas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        destructive
        onConfirm={() => {
          setConfirm(null);
          setEdit(null);
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title="Restaurar padrão do cliente"
        message="Seu painel pessoal será removido e você voltará a ver o painel padrão definido pelo cliente."
        confirmLabel="Restaurar"
        onConfirm={resetMine}
        onCancel={() => setConfirm(null)}
      />
      {guardDialog}
    </>
  );
}
