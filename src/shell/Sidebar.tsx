import { NavLink, Link } from 'react-router-dom';
import { moduleAccess } from '@/access';
import { Icon } from '@/components/ui';
import { MODULE_ORDER } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import styles from './Shell.module.css';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onNavigate: () => void;
}

/**
 * Menu lateral persistente e recolhível, na ordem oficial dos módulos.
 * - Sem permissão do perfil: o módulo não aparece.
 * - Não contratado: aparece bloqueado (cadeado), com explicação de valor ao abrir.
 */
export function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onNavigate }: SidebarProps) {
  const access = useAccess();
  const items = MODULE_ORDER.map((m) => ({ module: m, access: moduleAccess(access, m.id) })).filter(
    (i) => i.access !== 'no-permission',
  );

  return (
    <aside className={[styles.sidebar, mobileOpen && styles.sidebarOpen].filter(Boolean).join(' ')} aria-label="Menu principal">
      <Link to="/" className={styles.brand} onClick={onNavigate} title="GRS — Gestão de Riscos e Operações">
        <span className={styles.brandMark} aria-hidden="true">
          GRS
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandTitle}>GRS</span>
          <span className={styles.brandSubtitle}>Gestão de Riscos e Operações</span>
        </span>
      </Link>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {items.map(({ module, access: state }) => {
            const locked = state === 'not-contracted';
            return (
              <li key={module.id}>
                <NavLink
                  to={module.basePath}
                  onClick={onNavigate}
                  title={collapsed ? `${module.name}${locked ? ' (não contratado)' : ''}` : undefined}
                  className={({ isActive }) =>
                    [styles.navItem, isActive && styles.navItemActive, locked && styles.navLocked].filter(Boolean).join(' ')
                  }
                >
                  <Icon name={module.icon} className={styles.navIcon} />
                  <span className={styles.navLabel}>{module.name}</span>
                  {locked && <Icon name="lock" className={styles.navLock} label="Não contratado" />}
                  {locked && collapsed && <span className="visually-hidden">(não contratado)</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? 'angle-double-right' : 'angle-double-left'} />
          <span className={styles.collapseLabel}>Recolher menu</span>
        </button>
      </div>
    </aside>
  );
}
