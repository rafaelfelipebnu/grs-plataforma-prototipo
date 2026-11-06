import type {
  AssetGroup,
  GroupHistoryEntry,
  AccessPassage,
  DashboardLayout,
  AppNotification,
  Asset,
  AuditEntry,
  Classification,
  Company,
  Connector,
  Contract,
  DataPoint,
  DemoUser,
  Device,
  DeviceHealth,
  Location,
  OperationalEvent,
  OrgLocationMapping,
  OrgUnit,
  Person,
  DiscoveryCandidate,
  DiscoveryRun,
  MonitoringRule,
  PointReading,
  MaintenanceRequest,
  RedirectDestination,
  WorkOrder,
  Occurrence,
  OccurrenceType,
} from '@/domain';

/**
 * Banco simulado da demonstração. Agrupa as coleções por domínio proprietário
 * apenas por organização do código; o acesso sempre passa pelos serviços.
 */
export interface DemoDatabase {
  meta: {
    schemaVersion: number;
    seededAt: string;
  };
  // Plataforma
  company: Company;
  contract: Contract;
  users: DemoUser[];
  auditLog: AuditEntry[];
  notifications: AppNotification[];
  // Fonte integrada: Controle de Acesso (simulado)
  people: Person[];
  orgUnits: OrgUnit[];
  orgLocationMappings: OrgLocationMapping[];
  // Central de Ativos e Ambientes
  locations: Location[];
  classifications: Classification[];
  assets: Asset[];
  devices: Device[];
  groups: AssetGroup[];
  groupHistory: GroupHistoryEntry[];
  /** Indicadores da Central que não derivam diretamente do cadastro. */
  centralStats: {
    /** Cadastros/importações interrompidos por duplicidade detectada. */
    duplicatesAvoided: number;
  };
  // Monitor de Infraestrutura
  connectors: Connector[];
  deviceHealth: DeviceHealth[];
  dataPoints: DataPoint[];
  discoveryRuns: DiscoveryRun[];
  discoveryCandidates: DiscoveryCandidate[];
  monitoringRules: MonitoringRule[];
  pointReadings: PointReading[];
  // Gestão de Ocorrências
  occurrenceTypes: OccurrenceType[];
  occurrences: Occurrence[];
  occurrenceCounter: number;
  // Gestão de Manutenção
  maintenanceRequests: MaintenanceRequest[];
  workOrders: WorkOrder[];
  /** Destinos externos de redirecionamento (DP-38, lista configurável — demonstração). */
  redirectDestinations: RedirectDestination[];
  /** Sequenciais dos códigos legíveis. */
  maintenanceCounters: { request: number; workOrder: number };
  // Feed de eventos (Security Hub e fontes)
  events: OperationalEvent[];
  // Fonte integrada: passagens do Controle de Acesso (simulado)
  accessPassages: AccessPassage[];
  // Security Hub: painéis
  dashboards: {
    /** Layout padrão definido pelo cliente (administrador). */
    clientDefault: DashboardLayout;
    /** Painéis personalizados por usuário. Ausente = usa o padrão do cliente. */
    personal: Record<string, DashboardLayout>;
  };
  // Ferramenta do facilitador
  demoSettings: {
    /** Gera passagens de acesso simuladas periodicamente. */
    liveSimulation: boolean;
  };
}

/** Incrementar quando o formato mudar: dados persistidos antigos são descartados. */
export const DEMO_SCHEMA_VERSION = 6;
