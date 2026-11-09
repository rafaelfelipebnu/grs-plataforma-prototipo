import { useState } from 'react';
import { moduleAccess } from '@/access';
import { Badge, Button, Icon, Modal, SelectField } from '@/components/ui';
import { DASHBOARD_AREAS, DASHBOARD_AREA_LABEL, WIDGET_CATEGORY_LABEL, type DashboardArea, type WidgetCategory, type WidgetInstance, type WidgetTypeId } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { WIDGET_CATALOG, WIDGET_ORDER } from './catalog';
import styles from './dashboard.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  current: WidgetInstance[];
  onAdd: (type: WidgetTypeId, area: DashboardArea | undefined) => void;
}

const CATEGORIES: WidgetCategory[] = ['seguranca', 'operacao-integrada', 'gestao'];

/** Catálogo de widgets (modo de edição): os 17 widgets em três categorias. */
export function WidgetCatalogModal({ open, onClose, current, onAdd }: Props) {
  const access = useAccess();
  const [area, setArea] = useState<DashboardArea | ''>('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar widget"
      size="large"
      footerStart={
        <Button variant="link" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div style={{ maxWidth: 320, marginBottom: 16 }}>
        <SelectField
          label="Área de destino"
          emptyLabel="Área sugerida de cada widget"
          value={area}
          onChange={(e) => setArea(e.target.value as DashboardArea | '')}
          options={DASHBOARD_AREAS.map((a) => ({ value: a, label: DASHBOARD_AREA_LABEL[a] }))}
        />
      </div>
      {CATEGORIES.map((category) => (
        <section key={category} className={styles.catalogSection} aria-labelledby={`cat-${category}`}>
          <h3 id={`cat-${category}`} style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
            {WIDGET_CATEGORY_LABEL[category]}
          </h3>
          {WIDGET_ORDER.filter((t) => WIDGET_CATALOG[t].category === category).map((type) => {
            const def = WIDGET_CATALOG[type];
            const states = def.requiredModules.map((m) => ({ m, s: moduleAccess(access, m) }));
            const noPermission = states.some((x) => x.s === 'no-permission');
            const locked = states.find((x) => x.s === 'not-contracted');
            const count = current.filter((w) => w.type === type).length;
            return (
              <div key={type} className={styles.catalogItem}>
                <span className={styles.catalogIcon}>
                  <Icon name={def.icon} />
                </span>
                <div className={styles.catalogText}>
                  <div style={{ fontWeight: 600 }}>{def.name}</div>
                  <div className="helper">{def.description}</div>
                  <div className={styles.catalogBadges}>
                    {count > 0 && <Badge tone="blue">{count === 1 ? 'Já no painel' : `${count} no painel`}</Badge>}
                    {locked && <Badge tone="yellow" icon="lock">{MODULES[locked.m].name} não contratado</Badge>}
                    {noPermission && <Badge tone="gray">Sem permissão no seu perfil</Badge>}
                  </div>
                </div>
                <Button size="small" variant="secondary" icon="plus" disabled={noPermission} onClick={() => onAdd(type, area || undefined)} aria-label={`Adicionar ${def.name}`}>
                  Adicionar
                </Button>
              </div>
            );
          })}
        </section>
      ))}
    </Modal>
  );
}
