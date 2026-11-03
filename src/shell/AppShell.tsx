import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Icon, IconButton } from '@/components/ui';
import { useAccess } from '@/app/providers/SessionProvider';
import { useDataVersion, useServices } from '@/app/providers/ServicesProvider';
import { PageLabelProvider } from '@/app/navigation/contextNavigation';
import { CriticalNotificationWatcher } from './CriticalNotificationWatcher';
import { DemoControls } from './DemoControls';
import { GlobalSearch } from './GlobalSearch';
import { LiveSimulator } from './LiveSimulator';
import { LocationContextSelector } from './LocationContextSelector';
import { NotificationCenter } from './NotificationCenter';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import styles from './Shell.module.css';

const COLLAPSE_KEY = 'grs-ui-sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Estrutura persistente: faixa de demonstração, menu lateral, cabeçalho global e conteúdo. */
export function AppShell() {
  const access = useAccess();
  const services = useServices();
  useDataVersion();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const company = services.session.getCompany();
  const unread = services.notifications.unreadCount(access);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        globalThis.localStorage?.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* preferência apenas em memória */
      }
      return !c;
    });
  };

  return (
    <PageLabelProvider>
      <div className={[styles.app, collapsed && styles.collapsed].filter(Boolean).join(' ')}>
        <a href="#conteudo" className={styles.skipLink}>
          Pular para o conteúdo
        </a>
        <div className={styles.demoBar} role="note">
          <Icon name="flask" />
          <span className={styles.demoBarText}>
            <strong>Ambiente de demonstração</strong> · dados fictícios · integrações e dispositivos simulados
          </span>
          <span className={styles.demoBarShort}>Demonstração</span>
          <button type="button" className={styles.demoBarButton} onClick={() => setDemoOpen(true)}>
            <Icon name="sliders" /> Controles da demonstração
          </button>
        </div>

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onNavigate={() => setMobileOpen(false)}
        />
        {mobileOpen && <div className={styles.mobileScrim} onClick={() => setMobileOpen(false)} aria-hidden="true" />}

        <header className={styles.topbar}>
          <IconButton
            icon="bars"
            label="Abrir menu"
            className={styles.menuButton}
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
          />
          <div className={styles.workspace} title={company.legalName}>
            <span className={styles.workspaceTitle}>{company.displayName}</span>
            <span className={styles.workspaceSubtitle}>Cliente de demonstração</span>
          </div>
          <span className={styles.divider} aria-hidden="true" />
          <LocationContextSelector />
          <GlobalSearch />
          <span className={styles.topbarSpacer} />
          <div className={styles.topbarActions}>
            <IconButton
              icon="bell"
              label={unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'}
              badge={unread}
              onClick={() => setNotificationsOpen(true)}
            />
            <UserMenu />
          </div>
        </header>

        <main id="conteudo" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <DemoControls open={demoOpen} onClose={() => setDemoOpen(false)} />
      <CriticalNotificationWatcher />
      <LiveSimulator />
    </PageLabelProvider>
  );
}
