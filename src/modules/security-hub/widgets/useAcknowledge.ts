import { useState } from 'react';
import { useToast } from '@/components/ui';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';

/** Reconhecimento de alerta com feedback visível (usado nos widgets). */
export function useAcknowledge() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const acknowledge = async (eventId: string, label: string) => {
    setPending(eventId);
    try {
      await services.events.acknowledge(access, eventId);
      toast.show({ tone: 'success', title: 'Alerta reconhecido', message: label });
    } catch (error) {
      toast.show({ tone: 'error', title: 'Não foi possível reconhecer o alerta', message: isServiceError(error) ? error.message : undefined });
    } finally {
      setPending(null);
    }
  };

  return { acknowledge, pending };
}
