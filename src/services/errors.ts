export type ServiceErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'NOT_CONTRACTED' | 'VALIDATION' | 'CONFLICT';

/** Erro padronizado da camada de serviços (equivalente a respostas HTTP 403/404/422/409). */
export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export const forbidden = (message = 'Você não tem permissão para acessar este conteúdo.') =>
  new ServiceError('FORBIDDEN', message);

export const notFound = (message = 'Registro não encontrado.') => new ServiceError('NOT_FOUND', message);

export const notContracted = (message = 'Capacidade não contratada.') =>
  new ServiceError('NOT_CONTRACTED', message);
