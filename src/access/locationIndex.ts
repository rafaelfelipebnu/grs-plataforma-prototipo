import type { Id, Location } from '@/domain';

/**
 * Índice da hierarquia de localização para consultas rápidas de ancestrais
 * e descendentes. Construído a partir do cadastro único de localizações.
 */
export class LocationIndex {
  private readonly byId = new Map<Id, Location>();
  private readonly children = new Map<Id | null, Location[]>();

  constructor(locations: readonly Location[]) {
    for (const loc of locations) {
      this.byId.set(loc.id, loc);
      const list = this.children.get(loc.parentId) ?? [];
      list.push(loc);
      this.children.set(loc.parentId, list);
    }
    for (const list of this.children.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
  }

  get(id: Id): Location | undefined {
    return this.byId.get(id);
  }

  roots(): Location[] {
    return this.children.get(null) ?? [];
  }

  childrenOf(id: Id): Location[] {
    return this.children.get(id) ?? [];
  }

  /** Ancestrais da raiz até o próprio local (inclusive). */
  pathOf(id: Id): Location[] {
    const path: Location[] = [];
    let current = this.byId.get(id);
    const guard = new Set<Id>();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      path.unshift(current);
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return path;
  }

  /** O próprio local e todos os descendentes. */
  subtreeIds(id: Id): Set<Id> {
    const result = new Set<Id>();
    const stack: Id[] = [id];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (result.has(next) || !this.byId.has(next)) continue;
      result.add(next);
      for (const child of this.childrenOf(next)) stack.push(child.id);
    }
    return result;
  }

  isDescendantOrSelf(candidateId: Id, ancestorId: Id): boolean {
    return this.pathOf(candidateId).some((loc) => loc.id === ancestorId);
  }

  /** Unidade (nível mais alto) que contém o local. */
  unitOf(id: Id): Location | undefined {
    return this.pathOf(id)[0];
  }

  all(): Location[] {
    return Array.from(this.byId.values());
  }
}
