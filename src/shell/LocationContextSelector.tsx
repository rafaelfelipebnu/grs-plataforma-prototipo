import { useMemo, useRef, useState } from 'react';
import { Button, Icon, useDismiss } from '@/components/ui';
import { LOCATION_LEVEL_LABEL, type Id } from '@/domain';
import type { LocationTreeNode } from '@/services';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useDataVersion, useServices } from '@/app/providers/ServicesProvider';
import styles from './Shell.module.css';

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtra a árvore mantendo ancestrais dos nós que casam com o texto. */
function filterTree(nodes: LocationTreeNode[], query: string): LocationTreeNode[] {
  if (!query) return nodes;
  const q = normalize(query);
  return nodes
    .map((node) => {
      const children = filterTree(node.children, query);
      const match = normalize(`${node.location.name} ${node.location.code}`).includes(q);
      return match || children.length > 0 ? { ...node, children: match ? node.children : children } : null;
    })
    .filter((n): n is LocationTreeNode => n !== null);
}

interface TreeProps {
  nodes: LocationTreeNode[];
  depth: number;
  selectedId: Id | null;
  expanded: Set<Id>;
  forceExpand: boolean;
  onToggle: (id: Id) => void;
  onSelect: (id: Id) => void;
}

function Tree({ nodes, depth, selectedId, expanded, forceExpand, onToggle, onSelect }: TreeProps) {
  return (
    <ul className={styles.treeList} role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? 'Localizações' : undefined}>
      {nodes.map(({ location, children }) => {
        const hasChildren = children.length > 0;
        const isOpen = forceExpand || expanded.has(location.id);
        const selected = selectedId === location.id;
        return (
          <li key={location.id} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={selected}>
            <div className={styles.treeRow} style={{ paddingLeft: 4 + depth * 16 }}>
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.treeToggle}
                  onClick={() => onToggle(location.id)}
                  aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${location.name}`}
                >
                  <Icon name={isOpen ? 'caret-down' : 'caret-right'} />
                </button>
              ) : (
                <span className={styles.treeToggleSpacer} />
              )}
              <button
                type="button"
                className={[styles.treeItem, selected && styles.treeItemSelected].filter(Boolean).join(' ')}
                onClick={() => onSelect(location.id)}
              >
                <span className={styles.treeItemName}>{location.name}</span>
                <span className={styles.treeItemLevel}>{LOCATION_LEVEL_LABEL[location.level]}</span>
              </button>
            </div>
            {hasChildren && isOpen && (
              <Tree
                nodes={children}
                depth={depth + 1}
                selectedId={selectedId}
                expanded={expanded}
                forceExpand={forceExpand}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Unidade/localização contextual do cabeçalho global. Define o recorte
 * padrão de listas e indicadores dos módulos (incluindo descendentes),
 * sempre dentro do escopo do usuário.
 */
export function LocationContextSelector() {
  const access = useAccess();
  const services = useServices();
  const version = useDataVersion();
  const { activeLocationId, setActiveLocation } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => services.locations.getTree(access), [services, access, version]);
  const [expanded, setExpanded] = useState<Set<Id>>(() => new Set(tree.map((n) => n.location.id)));
  const filtered = useMemo(() => filterTree(tree, query.trim()), [tree, query]);

  const activePath = activeLocationId ? services.locations.pathOf(access, activeLocationId) : [];
  const activeLabel = activePath.length > 0 ? activePath[activePath.length - 1]!.name : 'Todas as localizações';
  const scopeLabel = access.visibleLocationIds === 'all' ? 'Escopo corporativo' : 'Seu escopo';

  const select = (id: Id | null) => {
    setActiveLocation(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={styles.popoverAnchor} ref={ref}>
      <button
        type="button"
        className={styles.contextButton}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={activePath.map((l) => l.name).join(' › ') || activeLabel}
      >
        <Icon name="map-marker" className="muted" />
        <span className={styles.contextButtonText}>
          <span className={styles.contextButtonLabel}>Localização</span>
          <span className={styles.contextButtonValue}>{activeLabel}</span>
        </span>
        <Icon name="angle-down" className="muted" />
      </button>
      {open && (
        <div className={`${styles.popover} ${styles.popoverLeft} ${styles.treePopover}`} role="dialog" aria-label="Selecionar localização contextual">
          <div className={styles.treeHeader}>
            <input
              className={styles.searchInput}
              style={{ paddingLeft: 10 }}
              placeholder="Filtrar localizações"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filtrar localizações"
              data-autofocus
              autoFocus
            />
            <p className="helper" style={{ marginTop: 6 }}>
              Filtra listas e indicadores dos módulos, incluindo os locais abaixo do selecionado. {scopeLabel}.
            </p>
          </div>
          <div className={styles.treeBody}>
            <Button
              variant="link"
              icon="globe"
              className={styles.treeAll}
              onClick={() => select(null)}
              aria-pressed={activeLocationId === null}
              style={{ justifyContent: 'flex-start', fontWeight: activeLocationId === null ? 600 : 400 }}
            >
              Todas as localizações do seu escopo
            </Button>
            {filtered.length === 0 ? (
              <p className="helper" style={{ padding: '8px 16px' }}>
                Nenhum resultado encontrado para sua busca.
              </p>
            ) : (
              <Tree
                nodes={filtered}
                depth={0}
                selectedId={activeLocationId}
                expanded={expanded}
                forceExpand={query.trim().length > 0}
                onToggle={(id) =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onSelect={(id) => select(id)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
