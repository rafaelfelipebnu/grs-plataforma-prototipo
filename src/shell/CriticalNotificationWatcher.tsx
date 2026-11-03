import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui';
import { useAccess } from '@/app/providers/SessionProvider';
import { useDataVersion, useServices } from '@/app/providers/ServicesProvider';
import { resolveTargetPath } from '@/app/navigation/targets';
import { useContextNavigation } from '@/app/navigation/contextNavigation';

/**
 * Notificações críticas aparecem imediatamente (docs/01); as demais ficam
 * apenas na central. As críticas já existentes ao entrar ficam na central;
 * só as que chegam durante a sessão geram aviso imediato.
 */
export function CriticalNotificationWatcher() {
  const access = useAccess();
  const services = useServices();
  const version = useDataVersion();
  const toast = useToast();
  const { navigateWithContext } = useContextNavigation();
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    const current = services.notifications.criticalUnread(access);
    if (known.current === null) {
      known.current = new Set(current.map((n) => n.id));
      return;
    }
    for (const n of current) {
      if (known.current.has(n.id)) continue;
      known.current.add(n.id);
      const path = resolveTargetPath(n.target, access, services);
      toast.show({
        tone: 'error',
        title: n.title,
        message: n.message,
        durationMs: 0,
        action: path
          ? {
              label: 'Abrir contexto',
              onClick: () => {
                void services.notifications.markRead(access, n.id);
                navigateWithContext(path);
              },
            }
          : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, access]);

  return null;
}
