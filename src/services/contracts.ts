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
  demo: DemoService;
}
