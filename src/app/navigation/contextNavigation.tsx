import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, type LinkProps } from 'react-router-dom';

/**
 * Navegação contextual (docs/01): ao sair de um ativo/local/evento para outro
 * módulo, o contexto anterior é empilhado e a tela de destino oferece retorno
 * sem perder filtros e seleção (que vivem na URL).
 */
export interface ReturnEntry {
  /** Caminho completo, incluindo query string (filtros). */
  path: string;
  label: string;
}

interface NavState {
  returnStack?: ReturnEntry[];
}

const MAX_STACK = 8;

/** Registro do rótulo da página atual, usado como "voltar para…". */
const PageLabelContext = createContext<{ current: string } | null>(null);

export function PageLabelProvider({ children }: { children: ReactNode }) {
  const ref = useRef({ current: 'página anterior' });
  return <PageLabelContext.Provider value={ref.current}>{children}</PageLabelContext.Provider>;
}

/** Cada página informa como deve ser chamada no "voltar para…". */
export function usePageLabel(label: string | undefined) {
  const holder = useContext(PageLabelContext);
  useEffect(() => {
    if (holder && label) holder.current = label;
  }, [holder, label]);
}

export function useReturnStack(): ReturnEntry[] {
  const location = useLocation();
  return (location.state as NavState | null)?.returnStack ?? [];
}

export function useContextNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const holder = useContext(PageLabelContext);
  const stack = useReturnStack();

  const stateFor = useCallback((): NavState => {
    const entry: ReturnEntry = { path: `${location.pathname}${location.search}`, label: holder?.current ?? 'página anterior' };
    return { returnStack: [...stack, entry].slice(-MAX_STACK) };
  }, [holder, location.pathname, location.search, stack]);

  /** Navega levando o contexto atual para permitir retorno. */
  const navigateWithContext = useCallback((to: string) => navigate(to, { state: stateFor() }), [navigate, stateFor]);

  /** Volta ao contexto anterior (restaurando URL com filtros). */
  const goBack = useCallback(() => {
    const previous = stack[stack.length - 1];
    if (!previous) return;
    navigate(previous.path, { state: { returnStack: stack.slice(0, -1) } satisfies NavState });
  }, [navigate, stack]);

  return { navigateWithContext, goBack, stack, stateFor };
}

/**
 * Link que preserva o contexto de origem. O contexto é calculado no clique
 * (o rótulo da página pode ter sido registrado depois da renderização).
 */
export function ContextLink({ to, children, onClick, ...rest }: Omit<LinkProps, 'state'> & { to: string }) {
  const { navigateWithContext } = useContextNavigation();
  return (
    <Link
      to={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        navigateWithContext(to);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
