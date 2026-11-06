import type { AccessContext } from '@/access';
import type {
  CandidateStatus,
  Protocol,
  DiscoveryCandidate,
  DiscoveryRun,
  MonitoringRule,
  PointReading,
  RuleOperator,
  AssetGroup,
  DataPointStatus,
  DeviceLocationStatus,
  GroupAudit,
  GroupCategory,
  GroupHistoryEntry,
  GroupRule,
  OperationalCondition,
  SourceSystem,
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
  MaintenancePriority,
  MaintenanceRequest,
  RedirectDestination,
  RequestStatus,
  WorkExecution,
  WorkOrder,
  WorkOrderStatus,
  Occurrence,
  OccurrenceOrigin,
  OccurrencePriority,
  OccurrenceStatus,
  OccurrenceType,
  Proceeding,
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

// ── Central de Ativos e Ambientes ────────────────────────────────────

export interface LocationFilter {
  /** Ausente = todo o escopo do usuário. */
  locationId?: Id;
  /** Padrão: true (inclui descendentes). false = somente este local. */
  includeDescendants?: boolean;
}

export type AssetSort = 'tag' | 'condicao' | 'criticidade';

export interface AssetQuery extends LocationFilter {
  search?: string;
  classificationId?: Id;
  criticality?: Criticality;
  condition?: OperationalCondition;
  withDevice?: 'com' | 'sem';
  groupId?: Id;
  sort?: AssetSort;
  page?: number;
  pageSize?: number;
}

export interface AssetListItem {
  asset: Asset;
  classificationName: string;
  locationPath: Location[];
  deviceCount: number;
  activeAlerts: number;
}

export interface CentralIndicators {
  totalAssets: number;
  /** Percentual de ativos com ao menos um dispositivo associado. */
  withDevicePercent: number;
  notNormal: number;
  byCriticality: Record<Criticality, number>;
  devices: { total: number; confirmed: number; suggested: number; unidentified: number };
  /** Dispositivos descobertos com localização confirmada e associados a ativo. */
  discoveredIncorporated: number;
  duplicatesAvoided: number;
  /** % de ativos com classificação, localização e responsável (direto ou herdado). */
  completenessPercent: number;
  activeAlerts: number;
}

export interface ChildLocationSummary {
  location: Location;
  assets: number;
  notNormal: number;
  activeAlerts: number;
}

export interface LocationOverview {
  location?: Location;
  path: Location[];
  responsible?: Person;
  indicators: CentralIndicators;
  attentionAssets: AssetListItem[];
  attentionEvents: LocationEventItem[];
  children: ChildLocationSummary[];
}

export interface DeviceQuery extends LocationFilter {
  locationStatus?: DeviceLocationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DeviceListItem {
  device: Device;
  /** Caminho da localização confirmada ou sugerida (conforme o estado). */
  locationPath: Location[];
  asset?: Asset;
  /** Presente somente com Monitor disponível. */
  health?: DeviceHealth;
  dataPointCount: number;
}

export interface DataPointQuery extends LocationFilter {
  status?: DataPointStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DataPointListItem {
  point: DataPoint;
  device: Device;
  asset?: Asset;
  locationPath: Location[];
}

export interface LocationEventQuery extends LocationFilter {
  source?: SourceSystem;
  category?: EventCategory;
  severities?: Severity[];
  status?: AlertStatus;
  period?: Period;
  assetId?: Id;
  page?: number;
  pageSize?: number;
}

export interface LocationEventItem {
  event: OperationalEvent;
  locationPath: Location[];
  securityRelevant: boolean;
  canAcknowledge: boolean;
}

export interface AssetInput {
  tag: string;
  name: string;
  description: string;
  classificationId: Id;
  primaryLocationId: Id;
  servedLocationIds: Id[];
  criticality: Criticality;
  directResponsiblePersonId?: Id;
  dependsOnAssetIds: Id[];
}

export interface DuplicateCheck {
  /** Ativo com a mesma tag (identificador único). */
  tagConflict?: Asset;
  /** A tag existe em ativo fora do escopo do usuário (sem expor o ativo). */
  tagTakenOutOfScope: boolean;
  /** Ativos com nome semelhante na mesma localização. */
  similar: Asset[];
}

export interface ImpactFactors {
  servedLocations: Location[];
  directDependents: Asset[];
  /** Dependentes indiretos (cadeia de dependências). */
  indirectDependents: Asset[];
  securitySystemsAffected: Asset[];
}

export interface HistoryItem {
  id: Id;
  at: string;
  actorName: string;
  moduleId: ModuleId | 'plataforma';
  action: string;
  summary: string;
}

export interface AssetGroupLink {
  group: AssetGroup;
  viaRules: boolean;
  manual: boolean;
  excepted: boolean;
}

export interface Asset360 extends AssetSummary {
  groups: AssetGroupLink[];
  events: LocationEventItem[];
  impact: ImpactFactors;
  history: HistoryItem[];
  canManage: boolean;
}

export interface ImportRow {
  line: number;
  values: Record<string, string>;
  input?: AssetInput;
  errors: string[];
  warnings: string[];
  /** Tag já cadastrada: duplicidade. */
  duplicateOf?: Asset;
  similar: Asset[];
  defaultAction: 'importar' | 'ignorar';
}

export interface ImportPreview {
  columns: string[];
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
}

export interface ImportResult {
  created: Asset[];
  skipped: number;
  duplicatesAvoided: number;
}

export interface CentralService {
  overview(ctx: AccessContext, filter: LocationFilter): Promise<LocationOverview>;
  listAssets(ctx: AccessContext, query: AssetQuery): Promise<Paged<AssetListItem>>;
  listDevices(ctx: AccessContext, query: DeviceQuery): Promise<Paged<DeviceListItem>>;
  /** Requer Monitor de Infraestrutura (dono dos pontos de dado). */
  listDataPoints(ctx: AccessContext, query: DataPointQuery): Promise<Paged<DataPointListItem>>;
  listEvents(ctx: AccessContext, query: LocationEventQuery): Promise<Paged<LocationEventItem>>;
  getAsset360(ctx: AccessContext, id: Id): Promise<Asset360>;
  classifications(): Classification[];
  /** Pessoas (fonte integrada) que podem ser responsáveis, no escopo. */
  assignablePeople(ctx: AccessContext): Person[];
  /** Ativos do escopo, para seleção de dependências. */
  assetOptions(ctx: AccessContext): Asset[];
  checkDuplicates(ctx: AccessContext, input: Pick<AssetInput, 'tag' | 'name' | 'primaryLocationId'>, excludeId?: Id): DuplicateCheck;
  createAsset(ctx: AccessContext, input: AssetInput): Promise<Asset>;
  updateAsset(ctx: AccessContext, id: Id, input: AssetInput, reason: string): Promise<Asset>;
  setCondition(ctx: AccessContext, id: Id, condition: OperationalCondition, reason: string): Promise<Asset>;
  registerDuplicateAvoided(ctx: AccessContext, detail: string): Promise<void>;
  previewImport(ctx: AccessContext, csv: string): ImportPreview;
  applyImport(ctx: AccessContext, preview: ImportPreview, decisions: Record<number, 'importar' | 'ignorar'>): Promise<ImportResult>;
}

// ── Grupos ───────────────────────────────────────────────────────────

export type AuditStatus = 'em-dia' | 'vencida' | 'pendente' | 'nao-aplicavel';

export interface GroupPermissions {
  editConfig: boolean;
  manageAssociations: boolean;
  registerAudit: boolean;
  /** Motivo de somente leitura, quando houver. */
  readOnlyReason?: string;
}

export interface GroupListItem {
  group: AssetGroup;
  memberCount: number;
  exceptionCount: number;
  auditStatus: AuditStatus;
  permissions: GroupPermissions;
}

export interface GroupMemberView {
  asset: Asset;
  ruleIds: Id[];
  manual: boolean;
  manualReason?: string;
  locationPath: Location[];
}

export interface GroupExceptionView {
  asset: Asset;
  reason: string;
  at: string;
  byName: string;
  /** Regras que incluiriam o ativo — conflito mantido pela exceção. */
  conflictingRuleIds: Id[];
}

export interface GroupAuditStatusRow {
  location: Location;
  lastAudit?: GroupAudit & { byName: string };
  status: AuditStatus;
}

export interface GroupHistoryView extends GroupHistoryEntry {
  actorName: string;
  assetTag?: string;
}

export interface GroupDetail {
  group: AssetGroup;
  members: GroupMemberView[];
  exceptions: GroupExceptionView[];
  /** Membros fora do escopo do usuário (contagem, sem dados). */
  hiddenOutOfScope: number;
  permissions: GroupPermissions;
  auditStatus: GroupAuditStatusRow[];
  history: GroupHistoryView[];
}

export interface GroupInput {
  name: string;
  description: string;
  category: 'corporativo' | 'operacional';
  scopeLocationId?: Id;
  rules: GroupRule[];
  consumers: ModuleId[];
  auditPeriodicityDays?: number;
}

export interface GroupRulePreview {
  added: Asset[];
  removed: Asset[];
  keptOutByException: Asset[];
  keptByManual: Asset[];
  totalAfter: number;
}

export interface GroupService {
  list(ctx: AccessContext, query: { category?: GroupCategory; search?: string }): Promise<GroupListItem[]>;
  get(ctx: AccessContext, id: Id): Promise<GroupDetail>;
  /** Prévia dos ativos afetados (grupo novo: id null). */
  preview(ctx: AccessContext, id: Id | null, input: Pick<GroupInput, 'rules' | 'scopeLocationId'>): GroupRulePreview;
  canCreate(ctx: AccessContext): { corporate: boolean; local: boolean };
  create(ctx: AccessContext, input: GroupInput, reason: string): Promise<AssetGroup>;
  updateConfig(ctx: AccessContext, id: Id, input: GroupInput, reason: string): Promise<AssetGroup>;
  includeAsset(ctx: AccessContext, id: Id, assetId: Id, reason: string): Promise<void>;
  removeInclusion(ctx: AccessContext, id: Id, assetId: Id, reason: string): Promise<void>;
  addException(ctx: AccessContext, id: Id, assetId: Id, reason: string): Promise<void>;
  removeException(ctx: AccessContext, id: Id, assetId: Id, reason: string): Promise<void>;
  registerAudit(ctx: AccessContext, id: Id, locationId: Id, notes: string): Promise<void>;
}

// ── Monitor de Infraestrutura ────────────────────────────────────────

export interface MonitorDeviceItem {
  device: Device;
  connector?: Connector;
  health?: DeviceHealth;
  asset?: Asset;
  locationPath: Location[];
  dataPointCount: number;
  /** Conector desativado: sem coleta. */
  collectionPaused: boolean;
}

export interface MonitorPointItem {
  point: DataPoint;
  device: Device;
  asset?: Asset;
  locationPath: Location[];
  rules: MonitoringRule[];
  collectionPaused: boolean;
}

export interface PointDetail extends MonitorPointItem {
  /** Série histórica (sintética + leituras registradas), mais antiga primeiro. */
  history: PointReading[];
  activeAlerts: LocationEventItem[];
  canManageRules: boolean;
}

export interface MonitorOverview {
  connectors: { total: number; active: number };
  communication: Record<CommunicationStatus, number>;
  devicesTotal: number;
  pointsOutOfNormal: number;
  pendingCandidates: number;
  activeAlerts: number;
  activeRules: number;
  degradedDevices: MonitorDeviceItem[];
  abnormalPoints: MonitorPointItem[];
}

export interface ConnectorItem {
  connector: Connector;
  unitName: string;
  deviceCount: number;
  pendingCandidates: number;
  lastRun?: DiscoveryRun;
}

export interface ConnectorInput {
  name: string;
  protocol: Protocol;
  unitLocationId: Id;
  networkScope: string;
}

export interface DiscoveryRunView extends DiscoveryRun {
  connectorName: string;
  byName: string;
}

export interface CandidateView {
  candidate: DiscoveryCandidate;
  connector: Connector;
  suggestedLocationPath: Location[];
  suggestedAsset?: Asset;
  suggestedClassification?: Classification;
  decidedByName?: string;
}

export interface DiscoveryResult {
  run: DiscoveryRun;
  candidates: DiscoveryCandidate[];
}

export interface RuleItem {
  rule: MonitoringRule;
  point: DataPoint;
  device: Device;
  asset?: Asset;
  locationPath: Location[];
  activeAlert?: OperationalEvent;
}

export interface RuleInput {
  name: string;
  pointId: Id;
  operator: RuleOperator;
  threshold: number | string;
  severity: Severity;
}

export interface MonitorDeviceQuery {
  communication?: CommunicationStatus;
  connectorId?: Id;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface MonitorPointQuery {
  status?: DataPointStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface MonitorService {
  overview(ctx: AccessContext): Promise<MonitorOverview>;
  listConnectors(ctx: AccessContext): Promise<ConnectorItem[]>;
  createConnector(ctx: AccessContext, input: ConnectorInput, reason: string): Promise<Connector>;
  setConnectorActive(ctx: AccessContext, id: Id, active: boolean, reason: string): Promise<Connector>;
  /** Descoberta somente leitura: gera candidatos; nada é criado ou associado na Central. */
  runDiscovery(ctx: AccessContext, connectorId: Id): Promise<DiscoveryResult>;
  listRuns(ctx: AccessContext): Promise<DiscoveryRunView[]>;
  listCandidates(ctx: AccessContext, query: { status?: CandidateStatus; connectorId?: Id }): Promise<CandidateView[]>;
  listDevices(ctx: AccessContext, query: MonitorDeviceQuery): Promise<Paged<MonitorDeviceItem>>;
  listPoints(ctx: AccessContext, query: MonitorPointQuery): Promise<Paged<MonitorPointItem>>;
  getPoint(ctx: AccessContext, pointId: Id): Promise<PointDetail>;
  /** Ferramenta do facilitador: injeta uma leitura simulada e avalia as regras. */
  simulateReading(ctx: AccessContext, pointId: Id, value: number | string): Promise<{ point: DataPoint; triggered: OperationalEvent[] }>;
  listRules(ctx: AccessContext): Promise<RuleItem[]>;
  createRule(ctx: AccessContext, input: RuleInput, reason: string): Promise<{ rule: MonitoringRule; triggered: OperationalEvent[] }>;
  updateRule(ctx: AccessContext, id: Id, input: RuleInput, reason: string): Promise<{ rule: MonitoringRule; triggered: OperationalEvent[] }>;
  setRuleActive(ctx: AccessContext, id: Id, active: boolean, reason: string): Promise<{ rule: MonitoringRule; triggered: OperationalEvent[] }>;
  listAlerts(ctx: AccessContext, query: { status?: AlertStatus; page?: number; pageSize?: number }): Promise<Paged<LocationEventItem>>;
  history(ctx: AccessContext, query: { page?: number; pageSize?: number }): Promise<Paged<HistoryItem>>;
  /** Pontos do escopo (para criar regras). */
  pointOptions(ctx: AccessContext): { point: DataPoint; device: Device }[];
}

// ── Revisão de descobertas (Central: aprovação humana) ───────────────

export type ReviewItem =
  | ({ kind: 'candidato' } & CandidateView)
  | {
      kind: 'dispositivo';
      device: Device;
      connector?: Connector;
      suggestedLocationPath: Location[];
      suggestedAsset?: Asset;
    };

export type ReviewAssociation =
  | { kind: 'nenhuma' }
  | { kind: 'existente'; assetId: Id }
  | { kind: 'novo'; asset: AssetInput };

export interface ReviewApproval {
  deviceName: string;
  /** Localização física confirmada pela pessoa (obrigatória). */
  locationId: Id;
  association: ReviewAssociation;
  reason: string;
}

export interface ReviewRef {
  kind: 'candidato' | 'dispositivo';
  id: Id;
}

export interface DiscoveryReviewService {
  /** Itens aguardando revisão no escopo (candidatos exigem o Monitor disponível). */
  pending(ctx: AccessContext): Promise<ReviewItem[]>;
  pendingCount(ctx: AccessContext): number;
  canReview(ctx: AccessContext): boolean;
  approve(ctx: AccessContext, ref: ReviewRef, input: ReviewApproval): Promise<{ device: Device; asset?: Asset }>;
  reject(ctx: AccessContext, ref: ReviewRef, reason: string): Promise<void>;
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

// ── Gestão de Manutenção ─────────────────────────────────────────────

/** O que o perfil pode fazer na Manutenção (permissão + contrato; escopo é verificado por registro). */
export interface MaintenancePermissions {
  request: boolean;
  triage: boolean;
  manageOrders: boolean;
  execute: boolean;
}

export interface MaintenanceHistoryView {
  at: string;
  actorName: string;
  text: string;
}

export interface RequestQuery extends LocationFilter {
  /** 'pendentes' = Aberta + Em triagem. */
  status?: RequestStatus | 'pendentes';
  search?: string;
  /** Somente solicitações abertas pelo usuário. */
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RequestListItem {
  request: MaintenanceRequest;
  asset?: Asset;
  locationPath: Location[];
  requesterName: string;
  workOrder?: WorkOrder;
  /** OS vinculada cancelada, aguardando decisão da triagem (DP-50). */
  awaitingTriageDecision: boolean;
}

export interface RequestActions {
  edit: boolean;
  cancel: boolean;
  startTriage: boolean;
  decide: boolean;
  resumeTriage: boolean;
}

export interface RequestDetail extends RequestListItem {
  history: MaintenanceHistoryView[];
  duplicateOf?: MaintenanceRequest;
  duplicates: MaintenanceRequest[];
  cancelledWorkOrders: WorkOrder[];
  triageName?: string;
  redirectDestination?: RedirectDestination;
  actions: RequestActions;
}

export interface NewRequestInput {
  title: string;
  description: string;
  locationId: Id;
  assetId?: Id;
  perceivedPriority: MaintenancePriority;
  origin: MaintenanceRequest['origin'];
  /** Ocorrência de origem (origin = 'ocorrencia'). */
  occurrenceId?: Id;
}

export type RequestEditInput = Pick<NewRequestInput, 'title' | 'description' | 'perceivedPriority'>;

export interface WorkOrderQuery extends LocationFilter {
  /** 'ativas' = não encerradas nem canceladas. */
  status?: WorkOrderStatus | 'ativas';
  search?: string;
  /** Somente OS atribuídas ao usuário (Minhas OS). */
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export interface WorkOrderListItem {
  order: WorkOrder;
  asset?: Asset;
  locationPath: Location[];
  technicianName?: string;
  /** Data prevista ultrapassada com a OS ainda ativa (indicador, não status). */
  overdue: boolean;
  openImpediments: number;
}

export interface ExecutionView {
  execution: WorkExecution;
  technicianName: string;
}

export interface WorkOrderActions {
  plan: boolean;
  startExecution: boolean;
  /** Execução em andamento do próprio usuário, se houver. */
  myRunningExecutionId?: Id;
  registerImpediment: boolean;
  submitForClosure: boolean;
  close: boolean;
  returnToExecution: boolean;
  suspend: boolean;
  /** Motivo pelo qual "Suspender" não está disponível agora. */
  suspendBlockedReason?: string;
  resume: boolean;
  cancel: boolean;
  cancelBlockedReason?: string;
  /** Hipótese demonstrativa (P-51). */
  interruptExecution: boolean;
}

export interface WorkOrderDetail extends WorkOrderListItem {
  requests: MaintenanceRequest[];
  executions: ExecutionView[];
  history: MaintenanceHistoryView[];
  actions: WorkOrderActions;
  /** Tempo total e líquido (sem suspensões), em ms. Sem desconto de SLA (D-013). */
  time: { totalMs: number; suspendedMs: number; netMs: number };
  createdByName: string;
}

export interface TechnicianOption {
  userId: Id;
  name: string;
  jobTitle: string;
}

export interface MaintenanceOverview {
  requestsByStatus: Record<RequestStatus, number>;
  ordersByStatus: Record<WorkOrderStatus, number>;
  overdueOrders: number;
  triageQueue: RequestListItem[];
  awaitingClosure: WorkOrderListItem[];
  withImpediments: WorkOrderListItem[];
  myOrders: WorkOrderListItem[];
  myRequests: RequestListItem[];
}

export interface MaintenanceService {
  permissions(ctx: AccessContext): MaintenancePermissions;
  overview(ctx: AccessContext, filter: LocationFilter): Promise<MaintenanceOverview>;
  // Solicitações
  listRequests(ctx: AccessContext, query: RequestQuery): Promise<Paged<RequestListItem>>;
  getRequest(ctx: AccessContext, id: Id): Promise<RequestDetail>;
  createRequest(ctx: AccessContext, input: NewRequestInput): Promise<MaintenanceRequest>;
  editRequest(ctx: AccessContext, id: Id, input: RequestEditInput): Promise<void>;
  cancelRequest(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  startTriage(ctx: AccessContext, id: Id): Promise<void>;
  convertToWorkOrder(ctx: AccessContext, id: Id, priority: MaintenancePriority): Promise<WorkOrder>;
  resolveWithoutOrder(ctx: AccessContext, id: Id, priority: MaintenancePriority, reason: string): Promise<void>;
  rejectRequest(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  markDuplicate(ctx: AccessContext, id: Id, originalId: Id, reason: string): Promise<void>;
  redirectRequest(ctx: AccessContext, id: Id, input: { destinationId?: Id; destinationText?: string; reason: string }): Promise<void>;
  resumeTriage(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  duplicateCandidates(ctx: AccessContext, id: Id): MaintenanceRequest[];
  redirectDestinations(ctx: AccessContext): RedirectDestination[];
  // Ordens de serviço e execução
  listWorkOrders(ctx: AccessContext, query: WorkOrderQuery): Promise<Paged<WorkOrderListItem>>;
  getWorkOrder(ctx: AccessContext, id: Id): Promise<WorkOrderDetail>;
  technicianOptions(ctx: AccessContext, locationId: Id): TechnicianOption[];
  planWorkOrder(ctx: AccessContext, id: Id, input: { technicianUserId: Id; plannedDate: string }): Promise<void>;
  startExecution(ctx: AccessContext, id: Id): Promise<void>;
  concludeExecution(ctx: AccessContext, id: Id, input: { workNotes: string; evidenceNames: string[] }): Promise<void>;
  registerImpediment(ctx: AccessContext, id: Id, description: string): Promise<void>;
  submitForClosure(ctx: AccessContext, id: Id): Promise<void>;
  closeWorkOrder(ctx: AccessContext, id: Id, note: string): Promise<void>;
  returnToExecution(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  suspendWorkOrder(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  resumeWorkOrder(ctx: AccessContext, id: Id): Promise<void>;
  cancelWorkOrder(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  /** Hipótese demonstrativa (P-51): execução Interrompida, pendente de validação. */
  interruptExecution(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  /** Solicitações e OS de um ativo (painel 360º da Central). */
  forAsset(ctx: AccessContext, assetId: Id): Promise<{ requests: RequestListItem[]; orders: WorkOrderListItem[] }>;
}

// ── Gestão de Ocorrências ────────────────────────────────────────────

/** Permissões conceituais separadas (DP-05). Registrar não implica tratar nem concluir. */
export interface OccurrencePermissions {
  register: boolean;
  treat: boolean;
  conclude: boolean;
  exception: boolean;
  configure: boolean;
}

export interface OccurrenceListItem {
  occurrence: Occurrence;
  type: OccurrenceType;
  asset?: Asset;
  locationPath: Location[];
  registeredByName: string;
  /** Pedido de aprovação de conclusão pendente (indicador, não status — DP-13). */
  awaitingApproval: boolean;
}

export interface OccurrenceQuery extends LocationFilter {
  /** 'abertas' = não concluídas. */
  status?: OccurrenceStatus | 'abertas';
  priority?: OccurrencePriority;
  typeId?: Id;
  origin?: OccurrenceOrigin;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type OccurrencePanelColumn = 'sem-tratamento' | 'em-andamento' | 'em-pausa' | 'concluidas-24h';

export interface OccurrencePanel {
  /** Pendentes (não concluídas) por prioridade, das mais recentes para as mais antigas. */
  pendingByPriority: Record<OccurrencePriority, OccurrenceListItem[]>;
  byStatus: Record<OccurrencePanelColumn, OccurrenceListItem[]>;
}

/** Situação de uma condição de conclusão. */
export interface ConclusionCondition {
  label: string;
  /** 'na-conclusao' = informada no momento de concluir (ex.: justificativa). */
  state: 'atendida' | 'pendente' | 'na-conclusao';
  origin: 'regra-atual' | 'tipo';
}

export interface ConclusionCheck {
  conditions: ConclusionCondition[];
  /** Regra atual atendida (status e ≥ 1 trâmite; nunca Em pausa — DP-04a). */
  baseMet: boolean;
  /** Condições do tipo verificáveis antes da conclusão atendidas. */
  typeMet: boolean;
  requiresApproval: boolean;
}

export interface OccurrenceActions {
  proceed: boolean;
  changePriority: boolean;
  pause: boolean;
  resume: boolean;
  conclude: boolean;
  requestApproval: boolean;
  decideApproval: boolean;
  /** Motivo pelo qual o usuário não pode decidir a aprovação (ex.: foi quem pediu). */
  decideApprovalBlockedReason?: string;
  concludeWithException: boolean;
  openMaintenanceRequest: boolean;
}

export interface OccurrenceHistoryView {
  at: string;
  actorName: string;
  kind: 'acao' | 'automatico';
  text: string;
}

export interface ProceedingView {
  proceeding: Proceeding;
  authorName: string;
}

export interface LinkedRequestRef {
  id: Id;
  code: string;
  title: string;
  status: RequestStatus;
}

export interface OccurrenceDetail extends OccurrenceListItem {
  proceedings: ProceedingView[];
  history: OccurrenceHistoryView[];
  check: ConclusionCheck;
  actions: OccurrenceActions;
  involvedPeople: Person[];
  /** Evento de origem, se o usuário puder vê-lo. */
  sourceEvent?: OperationalEvent;
  /** Solicitações de manutenção abertas a partir da ocorrência (dados da Manutenção, por consulta). */
  linkedRequests: LinkedRequestRef[];
  /** Solicitações vinculadas que o usuário não pode ver (sem dados operacionais). */
  hiddenLinkedRequests: number;
  /** Tempo de resposta (registro → 1º trâmite humano) e de solução (descontando pausas). */
  times: { responseMs?: number; solutionMs?: number; pausedMs: number };
  approvalRequestedByName?: string;
  conclusionByName?: string;
  approvedByName?: string;
  exceptionAuthorizedByName?: string;
}

export interface NewOccurrenceInput {
  typeId: Id;
  locationId: Id;
  assetId?: Id;
  description: string;
  occurredAt: string;
  priority: OccurrencePriority;
  involvedPersonIds: Id[];
  sourceEventId?: Id;
}

export interface ConclusionInput {
  justification?: string;
  evidenceNames: string[];
}

export interface OccurrenceBatchResult {
  done: { id: Id; code: string }[];
  kept: { id: Id; code: string; reason: string }[];
}

export interface OccurrenceHubSummary {
  open: OccurrenceListItem[];
  counts: Record<OccurrencePanelColumn, number>;
}

export interface OccurrenceService {
  permissions(ctx: AccessContext): OccurrencePermissions;
  types(ctx: AccessContext): OccurrenceType[];
  panel(ctx: AccessContext, filter: LocationFilter): Promise<OccurrencePanel>;
  list(ctx: AccessContext, query: OccurrenceQuery): Promise<Paged<OccurrenceListItem>>;
  get(ctx: AccessContext, id: Id): Promise<OccurrenceDetail>;
  register(ctx: AccessContext, input: NewOccurrenceInput): Promise<Occurrence>;
  addProceeding(ctx: AccessContext, id: Id, input: { text: string; attachments: string[] }): Promise<void>;
  /** Trâmite em lote ("Tratar ocorrências"): permitido enquanto não concluída. */
  addProceedingBatch(ctx: AccessContext, ids: Id[], text: string): Promise<OccurrenceBatchResult>;
  changePriority(ctx: AccessContext, id: Id, priority: OccurrencePriority): Promise<void>;
  pause(ctx: AccessContext, id: Id, reason: string): Promise<void>;
  resume(ctx: AccessContext, id: Id): Promise<void>;
  conclude(ctx: AccessContext, id: Id, input: ConclusionInput): Promise<void>;
  /** Conclusão em lote: as que não atendem ficam abertas, identificadas com o motivo (DP-14). */
  concludeBatch(ctx: AccessContext, ids: Id[]): Promise<OccurrenceBatchResult>;
  requestApproval(ctx: AccessContext, id: Id, input: ConclusionInput): Promise<void>;
  decideApproval(ctx: AccessContext, id: Id, approve: boolean, reason: string): Promise<void>;
  concludeWithException(ctx: AccessContext, id: Id, justification: string): Promise<void>;
  /** Dados do evento para pré-preencher o registro (origem preservada). */
  eventPrefill(ctx: AccessContext, eventId: Id): { event: OperationalEvent; locationId: Id; assetId?: Id } | null;
  /** Dados da ocorrência para pré-preencher uma solicitação de manutenção (origem preservada). */
  requestPrefill(ctx: AccessContext, id: Id): { id: Id; code: string; typeName: string; description: string; locationId: Id; assetId?: Id } | null;
  /** Resumo para os widgets do Security Hub. */
  hubSummary(ctx: AccessContext, filter: LocationFilter & { limit?: number }): Promise<OccurrenceHubSummary>;
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
  central: CentralService;
  groups: GroupService;
  monitor: MonitorService;
  discovery: DiscoveryReviewService;
  dashboards: DashboardService;
  maintenance: MaintenanceService;
  occurrences: OccurrenceService;
  demo: DemoService;
}
