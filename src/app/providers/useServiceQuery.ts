import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import type { RefreshMode } from '@/domain';
import { isServiceError, type ServiceError } from '@/services';
import { useDataVersion } from './ServicesProvider';

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: ServiceError | Error | undefined;
  reload: () => void;
  /** Momento da última carga bem-sucedida (ms). */
  updatedAt: number | undefined;
}

const REFRESH_MS: Record<Exclude<RefreshMode, 'tempo-real' | 'manual'>, number> = {
  '30s': 30_000,
  '1min': 60_000,
  '5min': 300_000,
};

/**
 * Converte a versão dos dados simulados conforme o modo de atualização:
 * tempo real acompanha cada alteração; intervalos só aplicam alterações a
 * cada período; manual só atualiza quando o usuário pede.
 */
function useRefreshVersion(dataVersion: number, mode: RefreshMode): number {
  const latest = useRef(dataVersion);
  latest.current = dataVersion;
  const [snapshot, setSnapshot] = useState(dataVersion);

  useEffect(() => {
    if (mode === 'tempo-real' || mode === 'manual') return;
    const timer = setInterval(() => setSnapshot(latest.current), REFRESH_MS[mode]);
    return () => clearInterval(timer);
  }, [mode]);

  return mode === 'tempo-real' ? dataVersion : snapshot;
}

/**
 * Executa uma consulta assíncrona à camada de serviços e a refaz quando as
 * dependências mudam ou quando os dados simulados são alterados (respeitando
 * o modo de atualização). Recargas por alteração de dados mantêm o conteúdo
 * atual (sem piscar).
 */
export function useServiceQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: { refresh?: RefreshMode } = {},
): QueryState<T> {
  const dataVersion = useDataVersion();
  const version = useRefreshVersion(dataVersion, options.refresh ?? 'tempo-real');
  const [state, setState] = useState<Omit<QueryState<T>, 'reload'>>({
    data: undefined,
    loading: true,
    error: undefined,
    updatedAt: undefined,
  });
  const [manual, setManual] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const lastDeps = useRef<DependencyList | null>(null);

  useEffect(() => {
    const depsChanged = lastDeps.current === null || !shallowEqual(lastDeps.current, deps);
    lastDeps.current = deps;
    let cancelled = false;
    setState((prev) => ({ ...prev, data: depsChanged ? undefined : prev.data, loading: true, error: undefined }));
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: undefined, updatedAt: Date.now() });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = isServiceError(error) || error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({ ...prev, data: undefined, loading: false, error: err }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, manual, ...deps]);

  const reload = useCallback(() => setManual((m) => m + 1), []);
  return { ...state, reload };
}

function shallowEqual(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}
