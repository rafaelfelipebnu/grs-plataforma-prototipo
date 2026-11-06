import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from '@/components/ui';

export const monitorPaths = {
  overview: '/monitor',
  connectors: '/monitor/conectores',
  discovery: '/monitor/descoberta',
  devices: '/monitor/dispositivos',
  points: '/monitor/pontos',
  point: (id: string) => `/monitor/pontos/${id}`,
  rules: '/monitor/regras',
  alerts: '/monitor/alertas',
  history: '/monitor/historico',
};

const SECTIONS = [
  { id: monitorPaths.overview, label: 'Visão geral' },
  { id: monitorPaths.connectors, label: 'Conectores' },
  { id: monitorPaths.discovery, label: 'Descoberta' },
  { id: monitorPaths.devices, label: 'Dispositivos' },
  { id: monitorPaths.points, label: 'Pontos de dado' },
  { id: monitorPaths.rules, label: 'Regras' },
  { id: monitorPaths.alerts, label: 'Alertas técnicos' },
  { id: monitorPaths.history, label: 'Histórico' },
];

/** Navegação entre as seções do Monitor (PRD: experiência sugerida). */
export function MonitorNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = [...SECTIONS].reverse().find((s) => pathname === s.id || (s.id !== monitorPaths.overview && pathname.startsWith(s.id)))?.id ?? monitorPaths.overview;
  return (
    <div style={{ marginBottom: 16 }}>
      <Tabs label="Seções do Monitor de Infraestrutura" items={SECTIONS} value={current} onChange={(id) => navigate(id)} />
    </div>
  );
}
