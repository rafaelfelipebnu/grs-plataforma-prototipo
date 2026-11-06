import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { isLocationVisible, type AccessContext } from '@/access';
import type { Id } from '@/domain';
import { useDataVersion, useServices } from './ServicesProvider';

interface SessionState {
  userId: Id | null;
  /** Localização contextual escolhida no cabeçalho (null = todo o escopo). */
  activeLocationId: Id | null;
}

interface SessionValue {
  /** Versão dos dados simulados: força re-render de quem lê dados de forma síncrona. */
  dataVersion: number;
  access: AccessContext | null;
  activeLocationId: Id | null;
  login: (userId: Id) => void;
  logout: () => void;
  setActiveLocation: (locationId: Id | null) => void;
}

const SESSION_KEY = 'grs-demo-session';
const SessionContext = createContext<SessionValue | null>(null);

function readSession(): SessionState {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);
    if (raw) return { userId: null, activeLocationId: null, ...(JSON.parse(raw) as Partial<SessionState>) };
  } catch {
    /* armazenamento indisponível: sessão apenas em memória */
  }
  return { userId: null, activeLocationId: null };
}

function writeSession(state: SessionState) {
  try {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignorado */
  }
}

export function SessionProvider({ children, initialUserId }: { children: ReactNode; initialUserId?: Id }) {
  const services = useServices();
  const version = useDataVersion();
  const [state, setState] = useState<SessionState>(() =>
    initialUserId ? { userId: initialUserId, activeLocationId: null } : readSession(),
  );

  const update = useCallback((next: SessionState) => {
    setState(next);
    writeSession(next);
  }, []);

  // Recalcula o contexto de acesso quando os dados mudam (ex.: contrato alterado),
  // mas preserva a MESMA instância enquanto usuário, perfil, escopo e contrato não
  // mudarem. Sem isso, toda alteração de dados recriava o contexto, as consultas
  // tratavam como troca de parâmetro e as telas eram remontadas (perdendo estado local).
  const accessCache = useRef<{ key: string; value: AccessContext | null }>({ key: '', value: null });
  const access = useMemo(() => {
    const next = state.userId ? services.session.resolveAccessContext(state.userId) : null;
    const key = next
      ? JSON.stringify([next.user.id, next.profile.id, next.user.scope, next.contract.planId, [...next.contract.capabilities].sort(), next.visibleLocationIds === 'all' ? 'all' : next.visibleLocationIds.size])
      : '';
    if (key && key === accessCache.current.key) return accessCache.current.value;
    accessCache.current = { key, value: next };
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.userId, services, version]);

  // Localização contextual inválida para o escopo atual é descartada.
  const activeLocationId =
    access && state.activeLocationId && isLocationVisible(access, state.activeLocationId) ? state.activeLocationId : null;

  const value = useMemo<SessionValue>(
    () => ({
      dataVersion: version,
      access,
      activeLocationId,
      login: (userId) => update({ userId, activeLocationId: null }),
      logout: () => update({ userId: null, activeLocationId: null }),
      setActiveLocation: (locationId) => update({ userId: state.userId, activeLocationId: locationId }),
    }),
    [access, activeLocationId, state.userId, update, version],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('SessionProvider ausente.');
  return ctx;
}

/** Contexto de acesso do usuário autenticado (uso dentro de rotas protegidas). */
export function useAccess(): AccessContext {
  const { access } = useSession();
  if (!access) throw new Error('Usuário não autenticado.');
  return access;
}
