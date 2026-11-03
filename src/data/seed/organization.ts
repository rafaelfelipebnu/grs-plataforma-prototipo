import type { Company, Location, OrgLocationMapping, OrgUnit } from '@/domain';

export const DEMO_COMPANY: Company = {
  id: 'comp-aurora',
  legalName: 'Aurora Indústria e Logística S.A. (fictícia)',
  displayName: 'Aurora Demo',
  isDemo: true,
};

const C = DEMO_COMPANY.id;

/** Hierarquia física única (cadastro de propriedade da Central). */
export const DEMO_LOCATIONS: Location[] = [
  // ── Unidade Joinville ──────────────────────────────────────────────
  { id: 'loc-joi', companyId: C, parentId: null, level: 'unidade', code: 'UN-JOI', name: 'Unidade Joinville', responsiblePersonId: 'p-03' },
  { id: 'loc-joi-adm', companyId: C, parentId: 'loc-joi', level: 'predio', code: 'JOI-ADM', name: 'Prédio Administrativo', responsiblePersonId: 'p-03' },
  { id: 'loc-joi-adm-t', companyId: C, parentId: 'loc-joi-adm', level: 'andar', code: 'JOI-ADM-T', name: 'Térreo' },
  { id: 'loc-joi-recepcao', companyId: C, parentId: 'loc-joi-adm-t', level: 'sala', code: 'JOI-ADM-T-REC', name: 'Recepção' },
  { id: 'loc-joi-servidores', companyId: C, parentId: 'loc-joi-adm-t', level: 'sala', code: 'JOI-ADM-T-SRV', name: 'Sala de Servidores', responsiblePersonId: 'p-09' },
  { id: 'loc-joi-adm-1', companyId: C, parentId: 'loc-joi-adm', level: 'andar', code: 'JOI-ADM-1', name: '1º Andar' },
  { id: 'loc-joi-reunioes', companyId: C, parentId: 'loc-joi-adm-1', level: 'sala', code: 'JOI-ADM-1-101', name: 'Sala de Reuniões 101' },
  { id: 'loc-joi-seg', companyId: C, parentId: 'loc-joi-adm-1', level: 'sala', code: 'JOI-ADM-1-SEG', name: 'Central de Segurança', responsiblePersonId: 'p-01' },
  { id: 'loc-joi-ind', companyId: C, parentId: 'loc-joi', level: 'predio', code: 'JOI-IND', name: 'Prédio Industrial', responsiblePersonId: 'p-04' },
  { id: 'loc-joi-linha1', companyId: C, parentId: 'loc-joi-ind', level: 'setor', code: 'JOI-IND-L1', name: 'Linha Produtiva 1' },
  { id: 'loc-joi-maquinas', companyId: C, parentId: 'loc-joi-ind', level: 'sala', code: 'JOI-IND-MAQ', name: 'Sala de Máquinas' },
  { id: 'loc-joi-almox', companyId: C, parentId: 'loc-joi-ind', level: 'setor', code: 'JOI-IND-ALM', name: 'Almoxarifado' },
  { id: 'loc-joi-ext', companyId: C, parentId: 'loc-joi', level: 'area', code: 'JOI-EXT', name: 'Área Externa', responsiblePersonId: 'p-04' },
  { id: 'loc-joi-portaria', companyId: C, parentId: 'loc-joi-ext', level: 'setor', code: 'JOI-EXT-PRT', name: 'Portaria Principal', responsiblePersonId: 'p-01' },
  { id: 'loc-joi-bombas', companyId: C, parentId: 'loc-joi-ext', level: 'sala', code: 'JOI-EXT-CBB', name: 'Casa de Bombas' },
  { id: 'loc-joi-reservatorio', companyId: C, parentId: 'loc-joi-ext', level: 'setor', code: 'JOI-EXT-RES', name: 'Reservatório de Água de Incêndio' },
  { id: 'loc-joi-estac', companyId: C, parentId: 'loc-joi-ext', level: 'setor', code: 'JOI-EXT-EST', name: 'Estacionamento' },
  // ── Unidade Curitiba (Centro de Distribuição) ─────────────────────
  { id: 'loc-cwb', companyId: C, parentId: null, level: 'unidade', code: 'UN-CWB', name: 'Unidade Curitiba – Centro de Distribuição', responsiblePersonId: 'p-07' },
  { id: 'loc-cwb-arm', companyId: C, parentId: 'loc-cwb', level: 'predio', code: 'CWB-ARM', name: 'Armazém Central', responsiblePersonId: 'p-07' },
  { id: 'loc-cwb-docas', companyId: C, parentId: 'loc-cwb-arm', level: 'setor', code: 'CWB-ARM-DOC', name: 'Docas de Expedição' },
  { id: 'loc-cwb-camara', companyId: C, parentId: 'loc-cwb-arm', level: 'sala', code: 'CWB-ARM-CFR', name: 'Câmara Fria' },
  { id: 'loc-cwb-adm', companyId: C, parentId: 'loc-cwb', level: 'predio', code: 'CWB-ADM', name: 'Bloco Administrativo' },
  { id: 'loc-cwb-recepcao', companyId: C, parentId: 'loc-cwb-adm', level: 'sala', code: 'CWB-ADM-REC', name: 'Recepção' },
  { id: 'loc-cwb-portaria', companyId: C, parentId: 'loc-cwb', level: 'area', code: 'CWB-PRT', name: 'Portaria de Caminhões', responsiblePersonId: 'p-08' },
];

/** Estrutura organizacional — separada da hierarquia física. */
export const DEMO_ORG_UNITS: OrgUnit[] = [
  { id: 'org-dir-ops', companyId: C, parentId: null, name: 'Diretoria de Operações' },
  { id: 'org-seg', companyId: C, parentId: 'org-dir-ops', name: 'Segurança Patrimonial' },
  { id: 'org-man', companyId: C, parentId: 'org-dir-ops', name: 'Manutenção e Facilities' },
  { id: 'org-prod', companyId: C, parentId: 'org-dir-ops', name: 'Produção' },
  { id: 'org-log', companyId: C, parentId: 'org-dir-ops', name: 'Logística' },
  { id: 'org-ti', companyId: C, parentId: null, name: 'Tecnologia da Informação' },
];

/** Mapeamento explícito estrutura organizacional ↔ localização. */
export const DEMO_ORG_LOCATION_MAPPINGS: OrgLocationMapping[] = [
  { orgUnitId: 'org-seg', locationId: 'loc-joi' },
  { orgUnitId: 'org-seg', locationId: 'loc-cwb' },
  { orgUnitId: 'org-man', locationId: 'loc-joi-ind' },
  { orgUnitId: 'org-man', locationId: 'loc-joi-ext' },
  { orgUnitId: 'org-prod', locationId: 'loc-joi-ind' },
  { orgUnitId: 'org-log', locationId: 'loc-cwb' },
  { orgUnitId: 'org-ti', locationId: 'loc-joi-servidores' },
];
