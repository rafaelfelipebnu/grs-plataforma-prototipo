import { useMemo } from 'react';
import type { SelectOption } from '@/components/ui';
import type { LocationTreeNode } from '@/services';
import { useAccess } from '../providers/SessionProvider';
import { useServices } from '../providers/ServicesProvider';

/** Opções de localização (indentadas) restritas ao escopo do usuário. */
export function useLocationOptions(maxDepth = 2): SelectOption[] {
  const access = useAccess();
  const services = useServices();
  return useMemo(() => {
    const out: SelectOption[] = [];
    const walk = (nodes: LocationTreeNode[], depth: number) => {
      for (const n of nodes) {
        if (depth <= maxDepth) out.push({ value: n.location.id, label: `${'— '.repeat(depth)}${n.location.name}` });
        walk(n.children, depth + 1);
      }
    };
    walk(services.locations.getTree(access), 0);
    return out;
  }, [services, access, maxDepth]);
}

/** Rótulo limpo (sem indentação) de uma opção de localização. */
export function locationOptionLabel(options: SelectOption[], id: string): string {
  return options.find((o) => o.value === id)?.label.replace(/^(— )+/, '') ?? id;
}
