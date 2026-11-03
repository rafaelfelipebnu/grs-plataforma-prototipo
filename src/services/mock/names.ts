import type { ModuleId } from '@/domain';

export const MODULE_NAMES: Record<ModuleId, string> = {
  'security-hub': 'Security Hub',
  central: 'Central de Ativos e Ambientes',
  monitor: 'Monitor de Infraestrutura',
  rotinas: 'Gestão de Rotinas',
  manutencao: 'Gestão de Manutenção',
  ocorrencias: 'Gestão de Ocorrências',
  riscos: 'Gestão de Riscos',
};
