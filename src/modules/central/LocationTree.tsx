import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui';
import { LOCATION_LEVEL_LABEL } from '@/domain';
import type { LocationTreeNode } from '@/services';
import { normalizeText } from './shared';
import styles from './central.module.css';

interface LocationTreeProps {
  roots: LocationTreeNode[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

/** Caminho de ids da raiz até o nó (para expandir ao selecionar). */
function ancestorsOf(roots: LocationTreeNode[], id: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!id) return out;
  const walk = (nodes: LocationTreeNode[], trail: string[]): boolean => {
    for (const n of nodes) {
      if (n.location.id === id) {
        trail.forEach((t) => out.add(t));
        return true;
      }
      if (walk(n.children, [...trail, n.location.id])) return true;
    }
    return false;
  };
  walk(roots, []);
  return out;
}

/**
 * Árvore permanente de localização da Central (docs/02). Restrita ao escopo
 * do usuário; a raiz "Todo o meu escopo" remove o recorte.
 */
export function LocationTree({ roots, selectedId, onSelect }: LocationTreeProps) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = ancestorsOf(roots, selectedId);
    roots.forEach((r) => initial.add(r.location.id));
    return initial;
  });

  // Garante que o nó selecionado (inclusive por navegação) esteja visível.
  const forced = useMemo(() => ancestorsOf(roots, selectedId), [roots, selectedId]);
  const term = normalizeText(filter.trim());

  /** Com filtro: mostra nós que casam e seus ancestrais. */
  const matches = useMemo(() => {
    if (!term) return null;
    const keep = new Set<string>();
    const walk = (n: LocationTreeNode, trail: string[]): void => {
      if (normalizeText(`${n.location.name} ${n.location.code}`).includes(term)) {
        keep.add(n.location.id);
        trail.forEach((t) => keep.add(t));
      }
      n.children.forEach((c) => walk(c, [...trail, n.location.id]));
    };
    roots.forEach((r) => walk(r, []));
    return keep;
  }, [roots, term]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNodes = (nodes: LocationTreeNode[], depth: number) => (
    <ul role={depth === 0 ? undefined : 'group'}>
      {nodes
        .filter((n) => !matches || matches.has(n.location.id))
        .map((n) => {
          const id = n.location.id;
          const open = Boolean(matches) || expanded.has(id) || forced.has(id);
          const hasChildren = n.children.length > 0;
          const active = id === selectedId;
          return (
            <li key={id} role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={active}>
              <div className={styles.treeRow} style={{ paddingLeft: depth * 14 }}>
                {hasChildren ? (
                  <button
                    type="button"
                    className={styles.treeToggle}
                    aria-label={`${open ? 'Recolher' : 'Expandir'} ${n.location.name}`}
                    onClick={() => toggle(id)}
                  >
                    <Icon name={open ? 'caret-down' : 'caret-right'} />
                  </button>
                ) : (
                  <span className={styles.treeToggleSpacer} />
                )}
                <button
                  type="button"
                  className={[styles.treeNode, active && styles.treeNodeActive].filter(Boolean).join(' ')}
                  onClick={() => onSelect(id)}
                  title={`${n.location.name} (${LOCATION_LEVEL_LABEL[n.location.level]})`}
                >
                  {n.location.name}
                  <span className={styles.treeLevel}>{LOCATION_LEVEL_LABEL[n.location.level]}</span>
                </button>
              </div>
              {hasChildren && open && renderNodes(n.children, depth + 1)}
            </li>
          );
        })}
    </ul>
  );

  return (
    <nav className={styles.treePanel} aria-label="Árvore de localização">
      <div className={styles.treeHeader}>
        <h2 className={styles.treeTitle}>Localizações</h2>
        <input
          className={styles.treeFilter}
          type="search"
          placeholder="Filtrar locais"
          aria-label="Filtrar locais"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className={styles.treeBody}>
        <div className={styles.treeRow}>
          <span className={styles.treeToggleSpacer} />
          <button
            type="button"
            className={[styles.treeNode, !selectedId && styles.treeNodeActive].filter(Boolean).join(' ')}
            onClick={() => onSelect(undefined)}
          >
            <Icon name="globe" /> Todo o meu escopo
          </button>
        </div>
        <div role="tree" aria-label="Locais" className={styles.tree}>
          {roots.length === 0 ? <p className="helper" style={{ padding: '8px 16px' }}>Nenhum local no seu escopo.</p> : renderNodes(roots, 0)}
          {matches && matches.size === 0 && <p className="helper" style={{ padding: '8px 16px' }}>Nenhum local encontrado.</p>}
        </div>
      </div>
    </nav>
  );
}
