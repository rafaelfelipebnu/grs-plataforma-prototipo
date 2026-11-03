import type { DemoUser, Person } from '@/domain';

/**
 * Pessoas fictícias provenientes de fonte integrada (Controle de Acesso —
 * integração simulada). E-mails usam o domínio reservado ".invalid".
 */
export const DEMO_PEOPLE: Person[] = [
  { id: 'p-01', name: 'Helena Duarte', personType: 'colaborador', jobTitle: 'Gerente de Segurança Corporativa', orgUnitId: 'org-seg', referenceLocationId: 'loc-joi-seg', email: 'helena.duarte@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10021' },
  { id: 'p-02', name: 'Marcos Vieira', personType: 'colaborador', jobTitle: 'Administrador da Plataforma', orgUnitId: 'org-ti', referenceLocationId: 'loc-joi-adm', email: 'marcos.vieira@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10002' },
  { id: 'p-03', name: 'Juliana Prado', personType: 'colaborador', jobTitle: 'Gerente da Unidade Joinville', orgUnitId: 'org-dir-ops', referenceLocationId: 'loc-joi-adm', email: 'juliana.prado@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10035' },
  { id: 'p-04', name: 'Ricardo Nunes', personType: 'colaborador', jobTitle: 'Coordenador de Manutenção', orgUnitId: 'org-man', referenceLocationId: 'loc-joi-ind', email: 'ricardo.nunes@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10047' },
  { id: 'p-05', name: 'André Lima', personType: 'colaborador', jobTitle: 'Técnico de Manutenção', orgUnitId: 'org-man', referenceLocationId: 'loc-joi-maquinas', email: 'andre.lima@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10058' },
  { id: 'p-06', name: 'Camila Rocha', personType: 'colaborador', jobTitle: 'Vigilante — Operadora de Rondas', orgUnitId: 'org-seg', referenceLocationId: 'loc-joi-portaria', email: 'camila.rocha@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10063' },
  { id: 'p-07', name: 'Fernanda Costa', personType: 'colaborador', jobTitle: 'Gerente do Centro de Distribuição', orgUnitId: 'org-log', referenceLocationId: 'loc-cwb-adm', email: 'fernanda.costa@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-20011' },
  { id: 'p-08', name: 'Paulo Mendes', personType: 'colaborador', jobTitle: 'Vigilante', orgUnitId: 'org-seg', referenceLocationId: 'loc-cwb-portaria', email: 'paulo.mendes@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-20019' },
  { id: 'p-09', name: 'Beatriz Santos', personType: 'colaborador', jobTitle: 'Analista de Infraestrutura de TI', orgUnitId: 'org-ti', referenceLocationId: 'loc-joi-servidores', email: 'beatriz.santos@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10071' },
  { id: 'p-10', name: 'Lucas Ferreira', personType: 'colaborador', jobTitle: 'Operador de Produção', orgUnitId: 'org-prod', referenceLocationId: 'loc-joi-linha1', email: 'lucas.ferreira@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-10084' },
  { id: 'p-11', name: 'Roberto Alves', personType: 'terceiro', jobTitle: 'Técnico de Climatização (Clima Sul Demo Ltda.)', referenceLocationId: 'loc-joi-maquinas', email: 'roberto.alves@climasul-demo.invalid', source: 'controle-acesso', externalRef: 'CA-T-0412' },
  { id: 'p-12', name: 'Sofia Martins', personType: 'visitante', jobTitle: 'Visitante — Auditoria externa', referenceLocationId: 'loc-joi-recepcao', email: 'sofia.martins@visitante-demo.invalid', source: 'controle-acesso', externalRef: 'CA-V-9031' },
  { id: 'p-13', name: 'Diego Ramos', personType: 'colaborador', jobTitle: 'Conferente de Expedição', orgUnitId: 'org-log', referenceLocationId: 'loc-cwb-docas', email: 'diego.ramos@aurora-demo.invalid', source: 'controle-acesso', externalRef: 'CA-20027' },
];

/** Personas de demonstração — uma por perfil de acesso. */
export const DEMO_USERS: DemoUser[] = [
  { id: 'u-admin', personId: 'p-02', login: 'marcos.vieira', profileId: 'admin-corporativo', scope: { kind: 'corporativo' } },
  { id: 'u-seg', personId: 'p-01', login: 'helena.duarte', profileId: 'gestor-seguranca', scope: { kind: 'corporativo' } },
  { id: 'u-local', personId: 'p-03', login: 'juliana.prado', profileId: 'gestor-local', scope: { kind: 'locais', rootLocationIds: ['loc-joi'] } },
  { id: 'u-man', personId: 'p-04', login: 'ricardo.nunes', profileId: 'gestor-manutencao', scope: { kind: 'locais', rootLocationIds: ['loc-joi'] } },
  { id: 'u-tec', personId: 'p-05', login: 'andre.lima', profileId: 'tecnico', scope: { kind: 'locais', rootLocationIds: ['loc-joi'] } },
  { id: 'u-oper', personId: 'p-06', login: 'camila.rocha', profileId: 'operador-rotinas', scope: { kind: 'locais', rootLocationIds: ['loc-joi'] } },
];
