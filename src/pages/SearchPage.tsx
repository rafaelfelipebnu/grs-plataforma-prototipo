import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Icon, LoadingState, PageHeader, Panel, Stack, TextField } from '@/components/ui';
import { SEARCH_TYPE_LABEL, type SearchResult, type SearchResultType } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { resolveTargetPath } from '@/app/navigation/targets';
import { SEARCH_TYPE_ICON } from '@/shell/searchMeta';
import styles from './Pages.module.css';

/** Resultados completos da busca global, com filtro por tipo (estado na URL). */
export function SearchPage() {
  const access = useAccess();
  const services = useServices();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const selectedTypes = (params.get('tipos')?.split(',').filter(Boolean) ?? []) as SearchResultType[];
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  usePageLabel(q ? `busca por "${q}"` : 'busca');

  const coverage = services.search.coverage(access);
  const query = useServiceQuery(
    () => services.search.search(access, q, { types: selectedTypes.length ? selectedTypes : undefined }),
    [q, params.get('tipos'), access],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    next.set('q', draft.trim());
    setParams(next);
  };

  const toggleType = (type: SearchResultType) => {
    const set = new Set(selectedTypes);
    if (set.has(type)) set.delete(type);
    else set.add(type);
    const next = new URLSearchParams(params);
    if (set.size) next.set('tipos', Array.from(set).join(','));
    else next.delete('tipos');
    setParams(next);
  };

  const grouped = new Map<SearchResultType, SearchResult[]>();
  for (const r of query.data ?? []) grouped.set(r.type, [...(grouped.get(r.type) ?? []), r]);
  const tooShort = q.trim().length < 2;

  return (
    <>
      <PageHeader title="Busca" breadcrumb={[{ label: 'Busca' }]} description="Resultados limitados às suas permissões, aos módulos contratados e ao seu escopo de localização." />
      <Stack>
        <Panel title="Pesquisar">
          <form className={styles.searchForm} onSubmit={submit} role="search">
            <TextField label="Termo de busca" value={draft} onChange={(e) => setDraft(e.target.value)} helper="Mínimo de 2 caracteres." />
            <Button type="submit" icon="search">
              Buscar
            </Button>
          </form>
          <div className={styles.typeFilters} role="group" aria-label="Filtrar por tipo">
            {coverage.map((c) => {
              const enabled = c.allowed;
              const active = selectedTypes.includes(c.type);
              return (
                <button
                  key={c.type}
                  type="button"
                  className={[styles.typeToggle, active && styles.typeToggleActive].filter(Boolean).join(' ')}
                  aria-pressed={active}
                  disabled={!enabled}
                  title={!c.allowed ? 'Seu perfil ou o contrato não incluem este tipo' : undefined}
                  onClick={() => toggleType(c.type)}
                >
                  <Icon name={SEARCH_TYPE_ICON[c.type]} /> {c.label}
                </button>
              );
            })}
          </div>
        </Panel>

        {tooShort ? (
          <Panel title="Resultados">
            <EmptyState icon="search" title="Digite ao menos 2 caracteres para buscar." />
          </Panel>
        ) : query.loading && !query.data ? (
          <LoadingState />
        ) : grouped.size === 0 ? (
          <Panel title="Resultados">
            <EmptyState icon="search" title="Nenhum resultado encontrado para sua busca." />
          </Panel>
        ) : (
          Array.from(grouped.entries()).map(([type, items]) => (
            <Panel key={type} title={`${SEARCH_TYPE_LABEL[type]} (${items.length})`} flush>
              <ul className={styles.list}>
                {items.map((r) => {
                  const path = resolveTargetPath(r.target, access, services);
                  return (
                    <li key={r.id} className={styles.listItem}>
                      <span className={styles.resultIcon}>
                        <Icon name={SEARCH_TYPE_ICON[r.type]} />
                      </span>
                      <div className={styles.listItemMain}>
                        {path ? (
                          <ContextLink to={path} className={styles.listItemTitle}>
                            {r.title}
                          </ContextLink>
                        ) : (
                          <span className={styles.listItemTitle}>{r.title}</span>
                        )}
                        <div className="helper">{r.subtitle}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))
        )}
      </Stack>
    </>
  );
}
