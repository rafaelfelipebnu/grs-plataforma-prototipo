import type { AccessContext } from '@/access';
import type {
  AccessPassage,
  AlertStatus,
  CommunicationStatus,
  Criticality,
  DashboardLayout,
  EventCategory,
  PassageDirection,
  PassageResult,
  Period,
  Severity,
  WidgetInstance,
  AppNotification,
  Asset,
  CapabilityId,
  Classification,
  CommercialPlanId,
  Company,
  Connector,
  Contract,
  DataPoint,
  DemoUser,
  Device,
  DeviceHealth,
  Id,
  Location,
  ModuleId,
  NavTarget,
  NotificationType,
  OperationalEvent,
  OrgUnit,
  Person,
  Profile,
} from '@/domain';

/**
 * Interfaces da camada de serviços. As implementações atuais são mocks sobre
 * a store local; podem ser substituídas por clientes de API sem alterar as telas.
 * Todos os métodos que retornam dados de negócio recebem o AccessContext e
 * aplicam permissão, contrato e escopo de localização.
 */

// ── Sessão e diretório ───────────────────────────────────────────────

export interface DemoUserSummary {
  user: DemoUser;
  person: Person;
  profile: Profile;
  scopeLabel: string;
}

export interface SessionService {
  listDemoUsers(): DemoUserSummary[];
  /** Resolve o contexto de acesso (equivale a validar o token). null se o usuário não existir. */
  resolveAccessContext(userId: Id): AccessContext | null;
  getCompany(): Company;
}

// ── Localização (Central) ────────────────────────────────────────────

export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

export interface LocationDetail {
  location: Location;
  /** Caminho da raiz até o local (inclusive). */
  path: Location[];
  responsible?: Person;
  childCount: number;
}

export interface LocationService {
  /** Árvore restrita ao escopo do usuário (raízes = topo do escopo). */
  getTree(ctx: AccessContext): LocationTreeNode[];
  get(ctx: AccessContext, id: Id): Promise<LocationDetail>;
  /** Caminho síncrono para exibição (rótulos). Retorna [] se fora do escopo. */
  pathOf(ctx: AccessContext, id: Id): Location[];
}

// ── Ativos e dispositivos (Central) ──────────────────────────────────

export type ResponsibilityOrigin =
  | { kind: 'direto' }
  | { kind: 'herdado'; fromLocation: Location }
  | { kind: 'nao-definido' };

export interface AssetSummary {
  asset: Asset;
  classificationPath: Classification[];
  primaryLocationPath: Location[];
  servedLocations: Location[];
  responsible?: Person;
  responsibilityOrigin: ResponsibilityOrigin;
  devices: Device[];
  /** Ativos dos quais este depende (visíveis no escopo). */
  dependsOn: Asset[];
  /** Ativos que dependem deste (visíveis no escopo) — base do impacto operacional. */
  dependents: Asset[];
}

export interface AssetService {
  get(ctx: AccessContext, id: Id): Promise<AssetSummary>;
}

export interface DeviceSummary {
  device: Device;
  locationPath: Location[];
  suggestedLocationPath: Location[];
  asset?: Asset;
  connector?: Connector;
  /** Presente somente se o Monitor de Infraestrutura estiver disponível. */
  monitoring?: { health?: DeviceHealth; dataPoints: DataPoint[] };
}

export interface DeviceService {
  get(ctx: AccessContext, id: Id): Promise<DeviceSummary>;
}

// ── Pessoas (fonte integrada) ────────────────────────────────────────

export interface PersonDetail {
  person: Person;
  orgUnit?: OrgUnit;
  referenceLocationPath: Location[];
}

export interface PeopleService {
  get(ctx: AccessContext, id: Id): Promise<PersonDetail>;
}

// ── Eventos (Security Hub e fontes) ──────────────────────────────────

export interface EventDetail {
  event: OperationalEvent;
  locationPath: Location[];
  asset?: Asset;
  device?: Device;
  acknowledgedBy?: Person;
  securityRelevant: boolean;
  canAcknowledge: boolean;
}

export interface EventRoutingInfo {
  securityRelevant: boolean;
  assetId?: Id;
  deviceId?: Id;
}

export interface EventService {
  get(ctx: AccessContext, id: Id): Promise<EventDetail>;
  /** Informação mínima para decidir o destino de navegação. null se não visível. */
  routingInfo(ctx: AccessContext, id: Id): EventRoutingInfo | null;
  acknowledge(ctx: AccessContext, id: Id): Promise<EventDetail>;
}

// ── Notificações ─────────────────────────────────────────────────────

export type NotificationCategory = 'nao-lidas' | 'todas' | 'importantes';

export interface NotificationFilter {
  category: NotificationCategory;
  moduleId?: ModuleId;
  type?: NotificationType;
  /** Inclui descendentes. */
  locationId?: Id;
  readStatus?: 'lida' | 'nao-lida';
}

export interface NotificationView {
  notification: AppNotification;
  read: boolean;
  locationPath: Location[];
  /** Estado do evento operacional vinculado, quando houver — independente da leitura. */
  linkedEventStatus?: OperationalEvent['status'];
}

export interface NotificationService {
  list(ctx: AccessContext, filter: NotificationFilter): Promise<NotificationView[]>;
  unreadCount(ctx: AccessContext): number;
  markRead(ctx: AccessContext, id: Id): Promise<void>;
  markAllRead(ctx: AccessContext, filter: NotificationFilter): Promise<number>;
  /** Notificações críticas visíveis e ainda não lidas (base para exibição imediata). */
  criticalUnread(ctx: AccessContext): AppNotification[];
}

// ── Busca global ─────────────────────────────────────────────────────

export type SearchResultType = 'asset' | 'device' | 'location' | 'person' | 'event' | 'occurrence' | 'request';

export interface SearchResult {
  type: SearchResultType;
  id: Id;
  title: string;
  subtitle: string;
  moduleId: ModuleId | 'pessoas';
  target: NavTarget;
}

export interface SearchCoverage {
  type: SearchResultType;
  label: string;
  /** false: o tipo existe na especificação, mas o módulo ainda não foi implementado. */
  implemented: boolean;
  /** false: o perfil/contrato não permite este tipo. */
  allowed: boolean;
}

export interface SearchService {
  search(ctx: AccessContext, query: string, options?: { types?: SearchResultType[]; limitPerType?: number }): Promise<SearchResult[]>;
  coverage(ctx: AccessContext): SearchCoverage[];
}

// ── Security Hub ─────────────────────────────────────────────────────

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EventSort = 'recentes' | 'severidade';

export interface EventQuery {
  status?: AlertStatus;
  severities?: Severity[];
  minSeverity?: Severity;
  categories?: EventCategory[];
  /** Inclui descendentes. */
  locationId?: Id;
  period?: Period;
  search?: string;
  sort?: EventSort;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface EventListItem {
  event: OperationalEvent;
  locationPath: Location[];
  canAcknowledge: boolean;
}

export interface AccessQuery {
  result?: PassageResult;
  direction?: PassageDirection;
  locationId?: Id;
  period?: Period;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AccessPassageView {
  passage: AccessPassage;
  /** Nome da pessoa — somente se o perfil puder consultar pessoas. */
  personName?: string;
  personId?: Id;
  locationPath: Location[];
}

export interface AccessPage extends Paged<AccessPassageView> {
  granted: number;
  denied: number;
}

export interface SecurityIndicators {
  activeAlerts: number;
  criticalActive: number;
  activeAlarms: number;
  acknowledgedInPeriod: number;
  deniedAccessInPeriod: number;
  camerasWithoutSignal: number;
}

export interface CameraView {
  asset: Asset;
  device?: Device;
  /** Estado da transmissão de vídeo (integração simulada). */
  streamStatus: CommunicationStatus | 'desconhecido';
  locationPath: Location[];
  activeEvents: number;
}

export interface CriticalAssetView {
  asset: Asset;
  locationPath: Location[];
  activeEvents: number;
  /** Sistemas de segurança que dependem deste ativo. */
  securityDependents: Asset[];
}

export interface InfrastructureHealthView {
  online: number;
  instavel: number;
  offline: number;
  attention: Array<{ device: Device; health: DeviceHealth; asset?: Asset; locationPath: Location[] }>;
}

export interface ResponseTimeView {
  /** Média em minutos; null se não houver eventos reconhecidos no período. */
  averageMinutes: number | null;
  acknowledgedCount: number;
  bySeverity: Array<{ severity: Severity; averageMinutes: number; count: number }>;
}

export interface LocationStatusRow {
  location: Location;
  activeAlerts: number;
  criticalAlerts: number;
  maxSeverity?: Severity;
  /** Ativos relevantes para segurança fora da condição normal. */
  assetsNotNormal: number;
  children: LocationStatusRow[];
}

export interface PendingAction {
  kind: 'reconhecer-alerta';
  event: OperationalEvent;
  locationPath: Location[];
  ageMinutes: number;
}

export interface HubFilter {
  locationId?: Id;
  period?: Period;
  limit?: number;
  minSeverity?: Severity;
  minCriticality?: Criticality;
}

export interface SecurityHubService {
  listEvents(ctx: AccessContext, query: EventQuery): Promise<Paged<EventListItem>>;
  acknowledgeMany(ctx: AccessContext, ids: Id[]): Promise<{ acknowledged: number; skipped: number }>;
  listAccess(ctx: AccessContext, query: AccessQuery): Promise<AccessPage>;
  indicators(ctx: AccessContext, filter: HubFilter): Promise<SecurityIndicators>;
  cameras(ctx: AccessContext, filter: HubFilter): Promise<CameraView[]>;
  criticalAssets(ctx: AccessContext, filter: HubFilter): Promise<CriticalAssetView[]>;
  /** Requer Monitor de Infraestrutura. */
  infrastructureHealth(ctx: AccessContext, filter: HubFilter): Promise<InfrastructureHealthView>;
  responseTime(ctx: AccessContext, filter: HubFilter): Promise<ResponseTimeView>;
  /** Situação por localização: filhos do local informado (ou raízes do escopo). */
  locationStatus(ctx: AccessContext, filter: HubFilter): Promise<LocationStatusRow[]>;
  pendingActions(ctx: AccessContext, filter: HubFilter): Promise<PendingAction[]>;
}

// ── Painéis (dashboard) ──────────────────────────────────────────────

export interface DashboardView {
  layout: DashboardLayout;
  /** De onde veio o layout exibido. */
  source: 'pessoal' | 'padrao-cliente';
}

export interface DashboardService {
  get(ctx: AccessContext): DashboardView;
  getClientDefault(ctx: AccessContext): DashboardLayout;
  saveMine(ctx: AccessContext, widgets: WidgetInstance[]): Promise<DashboardView>;
  /** Volta a usar o padrão do cliente. */
  resetMine(ctx: AccessContext): Promise<DashboardView>;
  /** Requer 'hub.dashboard.default'. Afeta apenas quem não personalizou. */
  saveClientDefault(ctx: AccessContext, widgets: WidgetInstance[]): Promise<DashboardLayout>;
  /** Quantos usuários têm painel pessoal (não afetados pelo padrão). */
  personalizedCount(ctx: AccessContext): number;
}

// ── Controles da demonstração (ferramenta do facilitador) ────────────

export interface DemoStatus {
  seededAt: string;
  persistenceAvailable: boolean;
  contract: Contract;
  scenarioAPumpFailureActive: boolean;
  liveSimulation: boolean;
}

export interface DemoService {
  status(): DemoStatus;
  setContract(planId: CommercialPlanId, customCapabilities?: CapabilityId[]): Promise<Contract>;
  setLiveSimulation(enabled: boolean): Promise<void>;
  /** Gera uma passagem de acesso simulada (se a simulação em tempo real estiver ligada). */
  tickLive(): void;
  reset(): Promise<void>;
  /** Cenário A: falha simulada na bomba BMB-014. */
  simulatePumpFailure(): Promise<{ eventId: Id; notificationId: Id }>;
}

export interface Services {
  session: SessionService;
  locations: LocationService;
  assets: AssetService;
  devices: DeviceService;
  people: PeopleService;
  events: EventService;
  notifications: NotificationService;
  search: SearchService;
  hub: SecurityHubService;
  dashboards: DashboardService;
  demo: DemoService;
}
