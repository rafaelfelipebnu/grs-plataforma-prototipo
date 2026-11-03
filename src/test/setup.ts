import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * O router de dados do React Router cria `Request` com o AbortSignal do jsdom,
 * que o `Request` nativo do Node (undici) rejeita. Somente no ambiente de
 * teste, removemos o signal estrangeiro (o Request cria o seu próprio).
 */
const NativeRequest = globalThis.Request;
class TestRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...rest } = init;
      super(input, rest);
    } else {
      super(input, init);
    }
  }
}
globalThis.Request = TestRequest as typeof Request;

afterEach(() => {
  cleanup();
  localStorage.clear();
});
