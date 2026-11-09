import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, useDismiss, useToast } from '@/components/ui';
import { SEARCH_TYPE_LABEL, type SearchResult } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { paths, resolveTargetPath } from '@/app/navigation/targets';
import { useContextNavigation } from '@/app/navigation/contextNavigation';
import { SEARCH_TYPE_ICON } from './searchMeta';
import styles from './Shell.module.css';

const MIN_CHARS = 2;

/**
 * Busca global: ativos/dispositivos, pessoas, locais, eventos/alertas
 * (e, quando implementados, ocorrências e solicitações/OS). Os resultados já
 * vêm filtrados por permissão, contrato e escopo pela camada de serviço.
 */
export function GlobalSearch() {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const toast = useToast();
  const { navigateWithContext } = useContextNavigation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  useDismiss(containerRef, open, () => setOpen(false));

  // Atalho "/" para focar a busca (sem sobrescrever atalhos do navegador).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      services.search
        .search(access, q, { limitPerType: 5 })
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setActive(found.length > 0 ? 0 : -1);
        })
        .finally(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, services, access]);

  const openResult = (result: SearchResult) => {
    const path = resolveTargetPath(result.target, access, services);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    if (!path) {
      toast.show({ tone: 'warning', title: 'Destino indisponível', message: 'Você não tem acesso ao módulo deste resultado.' });
      return;
    }
    navigateWithContext(path);
  };

  const goToAll = () => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return;
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(paths.search(q));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[active];
      if (open && selected) openResult(selected);
      else goToAll();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showPanel = open && query.trim().length >= MIN_CHARS;
  let lastType: string | null = null;

  return (
    <div className={styles.search} ref={containerRef} role="search">
      <Icon name="search" className={styles.searchIcon} />
      <input
        ref={inputRef}
        className={styles.searchInput}
        type="search"
        placeholder="Buscar ativos, locais, pessoas, eventos..."
        aria-label="Busca global"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {!query && <kbd className={styles.searchKbd}>/</kbd>}
      {showPanel && (
        <div className={`${styles.popover} ${styles.searchResults}`}>
          <div id={listId} role="listbox" aria-label="Resultados da busca">
            {results.map((result, index) => {
              const header = result.type !== lastType ? SEARCH_TYPE_LABEL[result.type] : null;
              lastType = result.type;
              return (
                <div key={`${result.type}-${result.id}`}>
                  {header && <div className={styles.searchGroup}>{header}</div>}
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={[styles.searchItem, index === active && styles.searchItemActive].filter(Boolean).join(' ')}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openResult(result)}
                  >
                    <span className={styles.searchItemIcon}>
                      <Icon name={SEARCH_TYPE_ICON[result.type]} />
                    </span>
                    <span className={styles.searchItemText}>
                      <span className={styles.searchItemTitle}>{result.title}</span>
                      <span className={styles.searchItemSubtitle}>{result.subtitle}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {loading && results.length === 0 && <div className={styles.searchEmpty}>Carregando dados...</div>}
          {!loading && results.length === 0 && <div className={styles.searchEmpty}>Nenhum resultado encontrado para sua busca.</div>}
          <div className={styles.searchFooter}>
            <span className="helper">Ativos, locais, eventos, ocorrências, solicitações, OS, planos e rotinas do seu escopo.</span>
            <button type="button" className="toast-action-link" onClick={goToAll} style={{ border: 0, background: 'none', color: 'var(--sds-primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Ver todos os resultados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
