import { useEffect } from 'react';
import { useServices } from '@/app/providers/ServicesProvider';

const TICK_MS = 8000;

/**
 * Gera passagens de acesso simuladas periodicamente para dar sensação de
 * "tempo real" na demonstração. Pode ser desligado nos controles da demonstração.
 */
export function LiveSimulator() {
  const services = useServices();
  useEffect(() => {
    const timer = setInterval(() => services.demo.tickLive(), TICK_MS);
    return () => clearInterval(timer);
  }, [services]);
  return null;
}
