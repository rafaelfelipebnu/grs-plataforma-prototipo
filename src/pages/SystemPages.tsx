import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { moduleAccess } from '@/access';
import { ErrorState, PageHeader, Panel } from '@/components/ui';
import { MODULE_ORDER } from '@/modules/registry';
import { useSession } from '@/app/providers/SessionProvider';

/** Exige persona selecionada; caso contrário, vai para a entrada da demonstração. */
export function RequireSession() {
  const { access } = useSession();
  const location = useLocation();
  if (!access) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/**
 * Após o login, abre o dashboard do Security Hub (docs/01). Perfis sem acesso
 * ao Hub vão para o primeiro módulo disponível (comportamento provisório,
 * registrado em docs/decisoes-evolucao.md).
 */
export function LandingRedirect() {
  const { access } = useSession();
  if (!access) return <Navigate to="/login" replace />;
  if (moduleAccess(access, 'security-hub') !== 'no-permission') return <Navigate to="/security-hub" replace />;
  const firstAvailable = MODULE_ORDER.find((m) => moduleAccess(access, m.id) === 'available');
  const firstVisible = firstAvailable ?? MODULE_ORDER.find((m) => moduleAccess(access, m.id) !== 'no-permission');
  return <Navigate to={firstVisible?.basePath ?? '/configuracoes'} replace />;
}

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página não encontrada" />
      <Panel title="Navegação">
        <ErrorState kind={404} text="O endereço acessado não existe neste protótipo." actions={<Link to="/">Ir para o início</Link>} />
      </Panel>
    </>
  );
}
