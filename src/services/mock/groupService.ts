import { can, type AccessContext } from '@/access';
import type { DemoDatabase } from '@/data/database';
import type { AssetGroup, GroupHistoryEntry, GroupRule, Id, Location, ModuleId } from '@/domain';
import type { AuditStatus, GroupAuditStatusRow, GroupDetail, GroupInput, GroupPermissions, GroupService } from '../contracts';
import { ServiceError, forbidden, notFound } from '../errors';
import { inScope, locationIndexOf, matchesQuery, simulateLatency, type ServiceRuntime } from '../internal';
import { computeMembership, previewRules } from './groupLogic';
import { OUT_OF_SCOPE_MESSAGE, requireModule } from './guards';
import { MODULE_NAMES } from './names';

const MIN_REASON = 5;
const STATUS_RANK: Record<AuditStatus, number> = { vencida: 3, pendente: 2, 'em-dia': 1, 'nao-aplicavel': 0 };

/**
 * Governança híbrida (docs/02):
 * - corporativo (permissão central.groups.corporate) define grupos compartilhados,
 *   regras gerais, consumidores e periodicidade mínima de auditoria;
 * - gestor local (central.manage, escopo local) valida associações, inclui/remove
 *   ativos do seu escopo, cria exceções, cria grupos e regras locais e conclui
 *   auditorias locais sem aprovação corporativa;
 * - grupos especializados são administrados pelo módulo dono (somente leitura aqui).
 */
function permissionsFor(ctx: AccessContext, group: AssetGroup): GroupPermissions {
  if (group.category === 'especializado') {
    return {
      editConfig: false,
      manageAssociations: false,
      registerAudit: false,
      readOnlyReason: `Grupo especializado administrado em ${MODULE_NAMES[group.ownerModule]}.`,
    };
  }
  const manage = can(ctx, 'central.manage');
  const corporate = can(ctx, 'central.groups.corporate');
  const localGroupInScope = Boolean(group.scopeLocationId && inScope(ctx, group.scopeLocationId));
  const editConfig = group.scopeLocationId ? manage && localGroupInScope : corporate;
  return {
    editConfig,
    manageAssociations: manage,
    registerAudit: manage,
    readOnlyReason: !manage
      ? 'Seu perfil pode consultar grupos, mas não alterar associações.'
      : !editConfig
        ? 'Regras e consumidores deste grupo são definidos pelo corporativo. Você pode gerenciar associações e exceções do seu escopo.'
        : undefined,
  };
}

function auditStatusOf(group: AssetGroup, locationId: Id, now: Date): { status: AuditStatus; last?: AssetGroup['audits'][number] } {
  if (!group.auditPeriodicityDays) return { status: 'nao-aplicavel' };
  const last = group.audits.filter((a) => a.locationId === locationId).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!last) return { status: 'pendente' };
  const ageDays = (now.getTime() - Date.parse(last.at)) / 86_400_000;
  return { status: ageDays > group.auditPeriodicityDays ? 'vencida' : 'em-dia', last };
}

export function createGroupService(rt: ServiceRuntime): GroupService {
  const findGroup = (ctx: AccessContext, id: Id) => {
    requireModule(ctx, 'central');
    const db = rt.store.getSnapshot();
    const group = db.groups.find((g) => g.id === id);
    if (!group) throw notFound('Grupo não encontrado.');
    if (group.scopeLocationId && !inScope(ctx, group.scopeLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
    return { db, group };
  };

  const requireReason = (reason: string) => {
    if (reason.trim().length < MIN_REASON) throw new ServiceError('VALIDATION', 'Informe o motivo (mínimo de 5 caracteres).');
  };

  /** Unidades em que o grupo é auditado, limitadas ao escopo do usuário. */
  const auditLocations = (ctx: AccessContext, db: Readonly<DemoDatabase>, group: AssetGroup): Location[] => {
    const index = locationIndexOf(db);
    if (group.scopeLocationId) return [index.get(group.scopeLocationId)!];
    return index.roots().filter((u) => inScope(ctx, u.id));
  };

  const userName = (db: Readonly<DemoDatabase>, userId: Id) => {
    const user = db.users.find((u) => u.id === userId);
    return db.people.find((p) => p.id === user?.personId)?.name ?? userId;
  };

  const history = (
    draft: DemoDatabase,
    ctx: AccessContext,
    entry: Omit<GroupHistoryEntry, 'id' | 'at' | 'actorUserId'>,
  ) => {
    draft.groupHistory.push({ ...entry, id: rt.newId('gh'), at: rt.now().toISOString(), actorUserId: ctx.user.id });
  };

  const validateInput = (ctx: AccessContext, db: Readonly<DemoDatabase>, input: GroupInput) => {
    const errors: string[] = [];
    if (input.name.trim().length < 3) errors.push('Informe o nome do grupo (mínimo de 3 caracteres).');
    if (db.groups.some((g) => g.name.trim().toLowerCase() === input.name.trim().toLowerCase() && g.scopeLocationId === input.scopeLocationId)) {
      // validado separadamente na edição
    }
    for (const rule of input.rules) {
      if (!rule.classificationIds?.length && !rule.criticalities?.length && !rule.locationIds?.length) {
        errors.push(`A regra "${rule.description || 'sem descrição'}" precisa de ao menos um critério.`);
      }
      const outside = rule.locationIds?.filter((l) => !inScope(ctx, l)) ?? [];
      if (outside.length) errors.push('A regra usa locais fora do seu escopo.');
    }
    if (input.auditPeriodicityDays !== undefined && (input.auditPeriodicityDays < 1 || input.auditPeriodicityDays > 730)) {
      errors.push('A periodicidade de auditoria deve estar entre 1 e 730 dias.');
    }
    if (errors.length) throw new ServiceError('VALIDATION', errors.join(' '));
  };

  /** Regras criadas por gestor local ficam restritas à localização do grupo local. */
  const normalizeRules = (rules: GroupRule[], scopeLocationId?: Id): GroupRule[] =>
    rules.map((r) => ({ ...r, id: r.id || rt.newId('r'), localScopeLocationId: scopeLocationId ?? r.localScopeLocationId }));

  const describeRules = (rules: GroupRule[]) => rules.map((r) => `"${r.description || 'regra sem descrição'}"`).join(', ') || 'sem regras';

  const assetInScope = (ctx: AccessContext, db: Readonly<DemoDatabase>, assetId: Id) => {
    const asset = db.assets.find((a) => a.id === assetId);
    if (!asset) throw notFound('Ativo não encontrado.');
    if (!inScope(ctx, asset.primaryLocationId)) throw forbidden('O ativo está fora do seu escopo.');
    return asset;
  };

  return {
    async list(ctx, q) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      const db = rt.store.getSnapshot();
      const now = rt.now();
      return db.groups
        .filter((g) => (!g.scopeLocationId || inScope(ctx, g.scopeLocationId)) && (!q.category || g.category === q.category))
        .filter((g) => !q.search?.trim() || matchesQuery(q.search, g.name, g.description))
        .map((group) => {
          const m = computeMembership(db, group);
          const statuses = auditLocations(ctx, db, group).map((l) => auditStatusOf(group, l.id, now).status);
          const worst = statuses.sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a])[0] ?? 'nao-aplicavel';
          return {
            group,
            memberCount: m.members.filter((x) => inScope(ctx, x.asset.primaryLocationId)).length,
            exceptionCount: m.excepted.filter((x) => inScope(ctx, x.asset.primaryLocationId)).length,
            auditStatus: worst,
            permissions: permissionsFor(ctx, group),
          };
        })
        .sort((a, b) => a.group.name.localeCompare(b.group.name, 'pt-BR'));
    },

    async get(ctx, id) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      const index = locationIndexOf(db);
      const m = computeMembership(db, group);
      const now = rt.now();
      const visibleMembers = m.members.filter((x) => inScope(ctx, x.asset.primaryLocationId));
      return {
        group,
        members: visibleMembers
          .map((x) => ({
            asset: x.asset,
            ruleIds: x.ruleIds,
            manual: x.manual,
            manualReason: group.manualInclusions.find((i) => i.assetId === x.asset.id)?.reason,
            locationPath: index.pathOf(x.asset.primaryLocationId),
          }))
          .sort((a, b) => a.asset.tag.localeCompare(b.asset.tag)),
        exceptions: m.excepted
          .filter((x) => inScope(ctx, x.asset.primaryLocationId))
          .map((x) => {
            const ex = group.exceptions.find((e) => e.assetId === x.asset.id)!;
            return { asset: x.asset, reason: ex.reason, at: ex.at, byName: userName(db, ex.byUserId), conflictingRuleIds: x.ruleIds };
          }),
        hiddenOutOfScope: m.members.length - visibleMembers.length,
        permissions: permissionsFor(ctx, group),
        auditStatus: auditLocations(ctx, db, group).map((location): GroupAuditStatusRow => {
          const { status, last } = auditStatusOf(group, location.id, now);
          return { location, status, lastAudit: last ? { ...last, byName: userName(db, last.byUserId) } : undefined };
        }),
        history: db.groupHistory
          .filter((h) => h.groupId === id && (!h.assetId || inScope(ctx, db.assets.find((a) => a.id === h.assetId)?.primaryLocationId)))
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((h) => ({ ...h, actorName: userName(db, h.actorUserId), assetTag: db.assets.find((a) => a.id === h.assetId)?.tag })),
      } satisfies GroupDetail;
    },

    preview(ctx, id, input) {
      requireModule(ctx, 'central');
      const db = rt.store.getSnapshot();
      const base: AssetGroup = id
        ? findGroup(ctx, id).group
        : {
            id: 'novo',
            name: '',
            description: '',
            category: 'operacional',
            ownerModule: 'central',
            scopeLocationId: input.scopeLocationId,
            rules: [],
            manualInclusions: [],
            exceptions: [],
            consumers: [],
            audits: [],
            createdAt: '',
            createdByUserId: ctx.user.id,
          };
      const result = previewRules(db, { ...base, scopeLocationId: input.scopeLocationId ?? base.scopeLocationId }, normalizeRules(input.rules, input.scopeLocationId ?? base.scopeLocationId));
      const visible = (list: typeof result.added) => list.filter((a) => inScope(ctx, a.primaryLocationId));
      return {
        added: visible(result.added),
        removed: visible(result.removed),
        keptOutByException: visible(result.keptOutByException),
        keptByManual: visible(result.keptByManual),
        totalAfter: result.totalAfter,
      };
    },

    canCreate(ctx) {
      return {
        corporate: can(ctx, 'central.groups.corporate'),
        local: can(ctx, 'central.manage') && ctx.visibleLocationIds !== 'all',
      };
    },

    async create(ctx, input, reason) {
      await simulateLatency(rt);
      requireModule(ctx, 'central');
      requireReason(reason);
      const db = rt.store.getSnapshot();
      const isLocal = Boolean(input.scopeLocationId);
      if (isLocal) {
        if (!can(ctx, 'central.manage')) throw forbidden('Seu perfil não pode criar grupos.');
        if (!inScope(ctx, input.scopeLocationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
        if (input.category !== 'operacional') throw new ServiceError('VALIDATION', 'Grupos locais são operacionais.');
      } else if (!can(ctx, 'central.groups.corporate')) {
        throw forbidden('Somente o corporativo cria grupos compartilhados para toda a empresa. Crie um grupo local da sua unidade.');
      }
      validateInput(ctx, db, input);
      if (db.groups.some((g) => g.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
        throw new ServiceError('CONFLICT', 'Já existe um grupo com este nome.');
      }
      const now = rt.now().toISOString();
      const group: AssetGroup = {
        id: rt.newId('g'),
        name: input.name.trim(),
        description: input.description.trim(),
        category: input.category,
        ownerModule: 'central',
        scopeLocationId: input.scopeLocationId,
        rules: normalizeRules(input.rules, input.scopeLocationId),
        manualInclusions: [],
        exceptions: [],
        consumers: input.consumers.map((moduleId) => ({ moduleId, reaction: 'nao-configurada' as const })),
        auditPeriodicityDays: input.auditPeriodicityDays,
        audits: [],
        createdAt: now,
        createdByUserId: ctx.user.id,
      };
      rt.store.mutate((draft) => {
        draft.groups.push(group);
        history(draft, ctx, {
          groupId: group.id,
          kind: 'configuracao',
          action: 'grupo.criar',
          origin: 'configuracao',
          reason: reason.trim(),
          summary: `Grupo criado com ${describeRules(group.rules)}.`,
        });
      });
      return group;
    },

    async updateConfig(ctx, id, input, reason) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).editConfig) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      requireReason(reason);
      validateInput(ctx, db, { ...input, scopeLocationId: group.scopeLocationId });
      if (db.groups.some((g) => g.id !== id && g.name.trim().toLowerCase() === input.name.trim().toLowerCase())) {
        throw new ServiceError('CONFLICT', 'Já existe um grupo com este nome.');
      }
      const nextRules = normalizeRules(input.rules, group.scopeLocationId);
      const preview = previewRules(db, group, nextRules);
      const changes: string[] = [];
      if (group.name !== input.name.trim()) changes.push('nome');
      if (group.description !== input.description.trim()) changes.push('descrição');
      if (JSON.stringify(group.rules) !== JSON.stringify(nextRules)) changes.push(`regras (${describeRules(nextRules)})`);
      const consumersBefore = group.consumers.map((c) => c.moduleId).sort().join();
      if (consumersBefore !== [...input.consumers].sort().join()) changes.push('módulos consumidores');
      if (group.auditPeriodicityDays !== input.auditPeriodicityDays) changes.push('periodicidade de auditoria');
      rt.store.mutate((draft) => {
        const g = draft.groups.find((x) => x.id === id)!;
        g.name = input.name.trim();
        g.description = input.description.trim();
        g.rules = nextRules;
        // Reação existente é preservada: é configurada no módulo consumidor.
        g.consumers = input.consumers.map((moduleId: ModuleId) => g.consumers.find((c) => c.moduleId === moduleId) ?? { moduleId, reaction: 'nao-configurada' });
        g.auditPeriodicityDays = input.auditPeriodicityDays;
        history(draft, ctx, {
          groupId: id,
          kind: 'configuracao',
          action: 'grupo.configurar',
          origin: 'configuracao',
          reason: reason.trim(),
          summary: `Configuração alterada: ${changes.join('; ') || 'sem mudanças relevantes'}.`,
        });
        // Associações resultantes da mudança de regra ficam na auditoria de associação.
        for (const a of preview.added) {
          history(draft, ctx, { groupId: id, kind: 'associacao', action: 'associacao.regra-incluir', assetId: a.id, origin: 'regra', reason: reason.trim(), summary: `${a.tag} passou a fazer parte do grupo por regra.` });
        }
        for (const a of preview.removed) {
          history(draft, ctx, { groupId: id, kind: 'associacao', action: 'associacao.regra-remover', assetId: a.id, origin: 'regra', reason: reason.trim(), summary: `${a.tag} deixou o grupo após mudança de regra.` });
        }
      });
      return rt.store.getSnapshot().groups.find((g) => g.id === id)!;
    },

    async includeAsset(ctx, id, assetId, reason) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).manageAssociations) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      requireReason(reason);
      const asset = assetInScope(ctx, db, assetId);
      if (group.scopeLocationId && !locationIndexOf(db).isDescendantOrSelf(asset.primaryLocationId, group.scopeLocationId)) {
        throw new ServiceError('VALIDATION', 'O ativo está fora da localização deste grupo local.');
      }
      if (group.exceptions.some((e) => e.assetId === assetId)) {
        throw new ServiceError('CONFLICT', `${asset.tag} tem uma exceção neste grupo. Remova a exceção antes de incluí-lo.`);
      }
      if (group.manualInclusions.some((i) => i.assetId === assetId)) throw new ServiceError('CONFLICT', `${asset.tag} já foi incluído manualmente.`);
      rt.store.mutate((draft) => {
        draft.groups.find((g) => g.id === id)!.manualInclusions.push({ assetId, reason: reason.trim(), byUserId: ctx.user.id, at: rt.now().toISOString() });
        history(draft, ctx, { groupId: id, kind: 'associacao', action: 'associacao.incluir', assetId, origin: 'manual', reason: reason.trim(), summary: `${asset.tag} incluído manualmente.` });
      });
    },

    async removeInclusion(ctx, id, assetId, reason) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).manageAssociations) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      requireReason(reason);
      const asset = assetInScope(ctx, db, assetId);
      if (!group.manualInclusions.some((i) => i.assetId === assetId)) throw new ServiceError('VALIDATION', `${asset.tag} não tem inclusão manual neste grupo.`);
      rt.store.mutate((draft) => {
        const g = draft.groups.find((x) => x.id === id)!;
        g.manualInclusions = g.manualInclusions.filter((i) => i.assetId !== assetId);
        history(draft, ctx, { groupId: id, kind: 'associacao', action: 'associacao.remover', assetId, origin: 'manual', reason: reason.trim(), summary: `Inclusão manual de ${asset.tag} removida.` });
      });
    },

    async addException(ctx, id, assetId, reason) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).manageAssociations) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      requireReason(reason);
      const asset = assetInScope(ctx, db, assetId);
      if (group.exceptions.some((e) => e.assetId === assetId)) throw new ServiceError('CONFLICT', `${asset.tag} já tem exceção neste grupo.`);
      if (group.manualInclusions.some((i) => i.assetId === assetId)) {
        throw new ServiceError('CONFLICT', `${asset.tag} foi incluído manualmente. Remova a inclusão manual em vez de criar uma exceção.`);
      }
      rt.store.mutate((draft) => {
        draft.groups.find((g) => g.id === id)!.exceptions.push({ assetId, reason: reason.trim(), byUserId: ctx.user.id, at: rt.now().toISOString() });
        history(draft, ctx, { groupId: id, kind: 'associacao', action: 'excecao.criar', assetId, origin: 'excecao', reason: reason.trim(), summary: `${asset.tag} mantido fora do grupo por exceção.` });
      });
    },

    async removeException(ctx, id, assetId, reason) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).manageAssociations) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      requireReason(reason);
      const asset = assetInScope(ctx, db, assetId);
      if (!group.exceptions.some((e) => e.assetId === assetId)) throw new ServiceError('VALIDATION', `${asset.tag} não tem exceção neste grupo.`);
      rt.store.mutate((draft) => {
        const g = draft.groups.find((x) => x.id === id)!;
        g.exceptions = g.exceptions.filter((e) => e.assetId !== assetId);
        history(draft, ctx, { groupId: id, kind: 'associacao', action: 'excecao.remover', assetId, origin: 'excecao', reason: reason.trim(), summary: `Exceção de ${asset.tag} removida; regras voltam a valer.` });
      });
    },

    async registerAudit(ctx, id, locationId, notes) {
      await simulateLatency(rt);
      const { db, group } = findGroup(ctx, id);
      if (!permissionsFor(ctx, group).registerAudit) throw forbidden(permissionsFor(ctx, group).readOnlyReason);
      if (!inScope(ctx, locationId)) throw forbidden(OUT_OF_SCOPE_MESSAGE);
      requireReason(notes);
      const index = locationIndexOf(db);
      const reviewed = computeMembership(db, group).members.filter((m) => index.isDescendantOrSelf(m.asset.primaryLocationId, locationId)).length;
      rt.store.mutate((draft) => {
        draft.groups.find((g) => g.id === id)!.audits.push({ id: rt.newId('au'), locationId, byUserId: ctx.user.id, at: rt.now().toISOString(), notes: notes.trim(), membersReviewed: reviewed });
        history(draft, ctx, {
          groupId: id,
          kind: 'associacao',
          action: 'auditoria.concluir',
          origin: 'auditoria',
          reason: notes.trim(),
          summary: `Auditoria local concluída em ${index.get(locationId)?.name ?? locationId} (${reviewed} associações revisadas).`,
        });
      });
    },
  };
}
