import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, useDismiss } from '@/components/ui';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import styles from './Shell.module.css';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase();
}

/** Perfil e configurações do usuário (cabeçalho global). */
export function UserMenu() {
  const access = useAccess();
  const { logout } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const name = access.person?.name ?? access.user.login;

  const switchProfile = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.popoverAnchor} ref={ref}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu do usuário ${name}`}
      >
        <span className={styles.avatar}>{initials(name)}</span>
        <Icon name="angle-down" className={`muted ${styles.hideMobile}`} />
      </button>
      {open && (
        <div className={`${styles.popover} ${styles.popoverRight} ${styles.userMenu}`} role="menu">
          <div className={styles.userMenuHeader}>
            <div className={styles.userMenuName}>{name}</div>
            <div className="helper">{access.person?.jobTitle}</div>
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Perfil:</strong> <span style={{ fontSize: 12 }}>{access.profile.name}</span>
            </div>
          </div>
          <ul className={styles.userMenuList}>
            <li>
              <Link to="/configuracoes" className={styles.userMenuItem} role="menuitem" onClick={() => setOpen(false)}>
                <Icon name="user-circle-o" fixedWidth /> Perfil e configurações
              </Link>
            </li>
            <li>
              <button type="button" className={styles.userMenuItem} role="menuitem" onClick={switchProfile}>
                <Icon name="exchange" fixedWidth /> Trocar perfil de demonstração
              </button>
            </li>
            <li>
              <button type="button" className={styles.userMenuItem} role="menuitem" onClick={switchProfile}>
                <Icon name="sign-out" fixedWidth /> Sair
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
