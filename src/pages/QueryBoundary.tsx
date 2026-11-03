import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorState, LoadingState, Panel } from '@/components/ui';
import { isServiceError } from '@/services';
import type { QueryState } from '@/app/providers/useServiceQuery';
import { LockedModuleView } from './ModuleGate';
import type { ModuleId } from '@/domain';

interface QueryBoundaryProps<T> {
  query: QueryState<T>;
  /** Módulo dono do registro (para exibir o estado "não contratado"). */
  moduleId?: ModuleId;
  children: (data: T) => ReactNode;
}

/** Traduz estados da camada de serviço em estados de tela do SDS (carregando, 403, 404, 500). */
export function QueryBoundary<T>({ query, moduleId, children }: QueryBoundaryProps<T>) {
  if (query.error) {
    const err = query.error;
    if (isServiceError(err)) {
      if (err.code === 'NOT_CONTRACTED' && moduleId) return <LockedModuleView moduleId={moduleId} />;
      if (err.code === 'FORBIDDEN' || err.code === 'NOT_CONTRACTED') {
        return (
          <Panel title="Acesso">
            <ErrorState kind={403} text={err.message} actions={<Link to="/">Ir para o início</Link>} />
          </Panel>
        );
      }
      if (err.code === 'NOT_FOUND') {
        return (
          <Panel title="Registro">
            <ErrorState kind={404} text={err.message} actions={<Link to="/">Ir para o início</Link>} />
          </Panel>
        );
      }
    }
    return (
      <Panel title="Erro">
        <ErrorState
          kind={500}
          text={err.message}
          actions={
            <Button variant="secondary" icon="refresh" onClick={query.reload}>
              Tentar novamente
            </Button>
          }
        />
      </Panel>
    );
  }
  if (query.data === undefined) return <LoadingState />;
  return <>{children(query.data)}</>;
}
