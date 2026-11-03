import { useNavigate } from 'react-router-dom';
import { Alert, DemoTag, Icon } from '@/components/ui';
import { useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { initials } from '@/shell/UserMenu';
import styles from './Pages.module.css';

/**
 * Entrada da demonstração: escolha da persona (perfil de acesso).
 * Não há autenticação real — nenhuma senha é solicitada ou armazenada.
 */
export function LoginPage() {
  const services = useServices();
  const { login } = useSession();
  const navigate = useNavigate();
  const users = services.session.listDemoUsers();
  const company = services.session.getCompany();

  const enter = (userId: string) => {
    login(userId);
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.login}>
      <header className={styles.loginHeader}>
        <span className={styles.loginMark} aria-hidden="true">
          GRS
        </span>
        <div>
          <div style={{ fontWeight: 700 }}>GRS — Gestão de Riscos e Operações</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Da portaria ao chão de fábrica</div>
        </div>
      </header>
      <main className={styles.loginBody}>
        <div className={styles.loginIntro}>
          <DemoTag>Protótipo de validação</DemoTag>
          <h1 className={styles.loginTitle} style={{ marginTop: 8 }}>
            Escolha um perfil para entrar
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Cliente de demonstração: {company.legalName}. Cada perfil mostra o que um usuário real enxergaria conforme suas permissões e
            seu escopo de localização.
          </p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Alert tone="info">
            Ambiente de demonstração com dados fictícios. Integrações, dispositivos e eventos são simulados; nenhuma senha é solicitada.
          </Alert>
        </div>
        <div className={styles.personaGrid}>
          {users.map(({ user, person, profile, scopeLabel }) => (
            <button key={user.id} type="button" className={styles.persona} onClick={() => enter(user.id)}>
              <span className={styles.personaHead}>
                <span className={styles.personaAvatar}>{initials(person.name)}</span>
                <span>
                  <span className={styles.personaName} style={{ display: 'block' }}>
                    {person.name}
                  </span>
                  <span className="helper">{person.jobTitle}</span>
                </span>
              </span>
              <span className={styles.personaProfile}>{profile.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {profile.description}
              </span>
              <span className={styles.personaMeta}>
                <Icon name="map-marker" /> Escopo: {scopeLabel}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
