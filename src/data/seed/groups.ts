import type { AssetGroup, GroupHistoryEntry, ISODateString } from '@/domain';

/** Grupos de demonstração cobrindo as três categorias, regras, inclusões manuais e exceções. */
export function createDemoGroups(at: (minutesAgo: number) => ISODateString): AssetGroup[] {
  const day = 1440;
  return [
    {
      id: 'g-incendio',
      name: 'Sistemas de combate a incêndio',
      description: 'Ativos de proteção contra incêndio sujeitos a inspeção periódica e prioridade de manutenção.',
      category: 'corporativo',
      ownerModule: 'central',
      rules: [{ id: 'r-incendio-1', description: 'Classificação: Proteção contra incêndio', classificationIds: ['cls-incendio'] }],
      manualInclusions: [
        { assetId: 'a-bmb014', reason: 'Bomba que abastece o sistema de água de incêndio.', byUserId: 'u-admin', at: at(30 * day) },
      ],
      exceptions: [],
      consumers: [
        { moduleId: 'security-hub', reaction: 'informativa' },
        { moduleId: 'rotinas', reaction: 'nao-configurada' },
        { moduleId: 'manutencao', reaction: 'nao-configurada' },
      ],
      auditPeriodicityDays: 90,
      audits: [
        { id: 'au-1', locationId: 'loc-joi', byUserId: 'u-local', at: at(40 * day), notes: 'Associações conferidas em campo.', membersReviewed: 3 },
      ],
      createdAt: at(120 * day),
      createdByUserId: 'u-admin',
    },
    {
      id: 'g-energia',
      name: 'Ativos críticos de energia',
      description: 'Geração e distribuição de energia de alta criticidade e cargas que dependem delas.',
      category: 'corporativo',
      ownerModule: 'central',
      rules: [
        {
          id: 'r-energia-1',
          description: 'Sistemas elétricos de criticidade alta',
          classificationIds: ['cls-ele'],
          criticalities: ['alta'],
        },
      ],
      manualInclusions: [
        { assetId: 'a-rack01', reason: 'Depende do gerador GER-002; incluído para planos de contingência.', byUserId: 'u-admin', at: at(20 * day) },
      ],
      exceptions: [],
      consumers: [
        { moduleId: 'manutencao', reaction: 'nao-configurada' },
        { moduleId: 'monitor', reaction: 'nao-configurada' },
      ],
      auditPeriodicityDays: 180,
      audits: [],
      createdAt: at(100 * day),
      createdByUserId: 'u-admin',
    },
    {
      id: 'g-climatizacao',
      name: 'Equipamentos de climatização',
      description: 'Climatização predial atendida pelo contrato de manutenção de ar-condicionado.',
      category: 'operacional',
      ownerModule: 'central',
      rules: [{ id: 'r-clima-1', description: 'Classificação: Climatização e refrigeração', classificationIds: ['cls-clim'] }],
      manualInclusions: [],
      exceptions: [
        { assetId: 'a-camfria', reason: 'Câmara fria tem contrato próprio da Logística.', byUserId: 'u-admin', at: at(15 * day) },
      ],
      consumers: [{ moduleId: 'manutencao', reaction: 'nao-configurada' }],
      auditPeriodicityDays: 180,
      audits: [],
      createdAt: at(60 * day),
      createdByUserId: 'u-admin',
    },
    {
      id: 'g-cameras-joi',
      name: 'Câmeras da área externa — Joinville',
      description: 'Câmeras do perímetro da unidade, revisadas pela segurança local.',
      category: 'operacional',
      ownerModule: 'central',
      scopeLocationId: 'loc-joi',
      rules: [
        {
          id: 'r-cam-1',
          description: 'Câmeras na Área Externa',
          classificationIds: ['cls-cam'],
          locationIds: ['loc-joi-ext'],
          localScopeLocationId: 'loc-joi',
        },
      ],
      manualInclusions: [],
      exceptions: [],
      consumers: [
        { moduleId: 'security-hub', reaction: 'nao-configurada' },
        { moduleId: 'rotinas', reaction: 'nao-configurada' },
      ],
      auditPeriodicityDays: 30,
      audits: [
        { id: 'au-2', locationId: 'loc-joi', byUserId: 'u-local', at: at(45 * day), notes: 'Sem alterações.', membersReviewed: 2 },
      ],
      createdAt: at(50 * day),
      createdByUserId: 'u-local',
    },
    {
      id: 'g-ronda-noturna',
      name: 'Pontos da ronda noturna — Joinville',
      description: 'Ativos usados como pontos de controle da ronda noturna.',
      category: 'especializado',
      ownerModule: 'rotinas',
      scopeLocationId: 'loc-joi',
      rules: [],
      manualInclusions: [
        { assetId: 'a-cam01', reason: 'Ponto de controle 1.', byUserId: 'u-local', at: at(70 * day) },
        { assetId: 'a-cta03', reason: 'Ponto de controle 2.', byUserId: 'u-local', at: at(70 * day) },
        { assetId: 'a-ext12', reason: 'Ponto de controle 3.', byUserId: 'u-local', at: at(70 * day) },
      ],
      exceptions: [],
      consumers: [],
      audits: [],
      createdAt: at(70 * day),
      createdByUserId: 'u-local',
    },
  ];
}

export function createDemoGroupHistory(at: (minutesAgo: number) => ISODateString): GroupHistoryEntry[] {
  const day = 1440;
  return [
    { id: 'gh-1', groupId: 'g-incendio', kind: 'configuracao', at: at(120 * day), actorUserId: 'u-admin', action: 'grupo.criar', origin: 'configuracao', reason: 'Padronização corporativa.', summary: 'Grupo criado com a regra "Classificação: Proteção contra incêndio".' },
    { id: 'gh-2', groupId: 'g-incendio', kind: 'associacao', at: at(30 * day), actorUserId: 'u-admin', action: 'associacao.incluir', assetId: 'a-bmb014', origin: 'manual', reason: 'Bomba que abastece o sistema de água de incêndio.', summary: 'BMB-014 incluída manualmente.' },
    { id: 'gh-3', groupId: 'g-energia', kind: 'configuracao', at: at(100 * day), actorUserId: 'u-admin', action: 'grupo.criar', origin: 'configuracao', reason: 'Plano de contingência energética.', summary: 'Grupo criado com a regra "Sistemas elétricos de criticidade alta".' },
    { id: 'gh-4', groupId: 'g-energia', kind: 'associacao', at: at(20 * day), actorUserId: 'u-admin', action: 'associacao.incluir', assetId: 'a-rack01', origin: 'manual', reason: 'Depende do gerador GER-002.', summary: 'RACK-SRV-01 incluído manualmente.' },
    { id: 'gh-5', groupId: 'g-climatizacao', kind: 'configuracao', at: at(60 * day), actorUserId: 'u-admin', action: 'grupo.criar', origin: 'configuracao', reason: 'Contrato de manutenção de ar-condicionado.', summary: 'Grupo criado com a regra "Classificação: Climatização e refrigeração".' },
    { id: 'gh-6', groupId: 'g-climatizacao', kind: 'associacao', at: at(15 * day), actorUserId: 'u-admin', action: 'excecao.criar', assetId: 'a-camfria', origin: 'excecao', reason: 'Câmara fria tem contrato próprio da Logística.', summary: 'CFR-01 mantida fora do grupo por exceção.' },
    { id: 'gh-7', groupId: 'g-cameras-joi', kind: 'configuracao', at: at(50 * day), actorUserId: 'u-local', action: 'grupo.criar', origin: 'configuracao', reason: 'Revisão do perímetro.', summary: 'Grupo local criado com a regra "Câmeras na Área Externa".' },
    { id: 'gh-8', groupId: 'g-cameras-joi', kind: 'associacao', at: at(45 * day), actorUserId: 'u-local', action: 'auditoria.concluir', origin: 'auditoria', reason: 'Sem alterações.', summary: 'Auditoria local concluída na Unidade Joinville.' },
    { id: 'gh-9', groupId: 'g-incendio', kind: 'associacao', at: at(40 * day), actorUserId: 'u-local', action: 'auditoria.concluir', origin: 'auditoria', reason: 'Associações conferidas em campo.', summary: 'Auditoria local concluída na Unidade Joinville.' },
  ];
}
