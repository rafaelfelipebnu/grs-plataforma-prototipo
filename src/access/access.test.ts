import { describe, expect, it } from 'vitest';
import { DEMO_LOCATIONS } from '@/data/seed/organization';
import { DEMO_PEOPLE, DEMO_USERS } from '@/data/seed/people';
import {
  LocationIndex,
  buildAccessContext,
  buildContract,
  can,
  hasActionPlanCapability,
  isLocationVisible,
  moduleAccess,
} from '.';

const index = new LocationIndex(DEMO_LOCATIONS);
const ctxFor = (userId: string, contract = buildContract('integrado')) => {
  const user = DEMO_USERS.find((u) => u.id === userId)!;
  return buildAccessContext(user, DEMO_PEOPLE.find((p) => p.id === user.personId), contract, index);
};

describe('hierarquia de localização', () => {
  it('monta o caminho da unidade até a sala', () => {
    expect(index.pathOf('loc-joi-servidores').map((l) => l.id)).toEqual([
      'loc-joi',
      'loc-joi-adm',
      'loc-joi-adm-t',
      'loc-joi-servidores',
    ]);
  });

  it('inclui o próprio local e todos os descendentes na subárvore', () => {
    const ids = index.subtreeIds('loc-joi-ext');
    expect(ids).toContain('loc-joi-ext');
    expect(ids).toContain('loc-joi-bombas');
    expect(ids).not.toContain('loc-joi-ind');
  });
});

describe('escopo do usuário', () => {
  it('escopo corporativo enxerga todas as unidades', () => {
    const ctx = ctxFor('u-seg');
    expect(isLocationVisible(ctx, 'loc-cwb-docas')).toBe(true);
    expect(isLocationVisible(ctx, 'loc-joi-bombas')).toBe(true);
  });

  it('Gestor Local de Joinville não enxerga Curitiba', () => {
    const ctx = ctxFor('u-local');
    expect(isLocationVisible(ctx, 'loc-joi-bombas')).toBe(true);
    expect(isLocationVisible(ctx, 'loc-cwb-docas')).toBe(false);
  });
});

describe('perfis de acesso x perfis comerciais', () => {
  it('módulo sem permissão do perfil fica oculto (no-permission)', () => {
    expect(moduleAccess(ctxFor('u-oper'), 'security-hub')).toBe('no-permission');
    expect(moduleAccess(ctxFor('u-oper'), 'rotinas')).toBe('available');
  });

  it('módulo permitido mas não contratado fica bloqueado (not-contracted)', () => {
    const ctx = ctxFor('u-seg', buildContract('essencial'));
    expect(moduleAccess(ctx, 'monitor')).toBe('not-contracted');
    expect(moduleAccess(ctx, 'security-hub')).toBe('available');
  });

  it('Técnico não consulta pessoas; Gestor de Segurança consulta', () => {
    expect(can(ctxFor('u-tec'), 'pessoas.view')).toBe(false);
    expect(can(ctxFor('u-seg'), 'pessoas.view')).toBe(true);
  });
});

describe('contrato', () => {
  it('ocorrência básica está sempre incluída', () => {
    expect(buildContract('personalizado', ['central']).capabilities).toContain('ocorrencias');
  });

  it('plano de ação é habilitado por Ocorrências Avançadas, Rotinas ou Manutenção — não por Riscos', () => {
    expect(hasActionPlanCapability(buildContract('personalizado', ['riscos']))).toBe(false);
    expect(hasActionPlanCapability(buildContract('personalizado', ['ocorrencias-avancadas']))).toBe(true);
    expect(hasActionPlanCapability(buildContract('personalizado', ['rotinas']))).toBe(true);
    expect(hasActionPlanCapability(buildContract('personalizado', ['manutencao']))).toBe(true);
  });
});
