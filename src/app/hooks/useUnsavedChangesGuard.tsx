import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui';

/**
 * Evita perder alterações sem aviso (docs/01): bloqueia a navegação interna e
 * o fechamento da aba enquanto houver alterações não salvas.
 * Retorna o diálogo de confirmação a ser renderizado pela tela.
 */
export function useUnsavedChangesGuard(dirty: boolean, message = 'Você tem alterações não salvas. Deseja sair e descartá-las?') {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Alterações não salvas"
      message={message}
      confirmLabel="Descartar e sair"
      cancelLabel="Continuar editando"
      destructive
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}
