import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, ErrorState, FilterPanel, LoadingState, Panel, SelectField, Stack, TextField, tableStyles as t, type AppliedFilter } from '@/components/ui';
import { GROUP_CATEGORY_LABEL, type GroupCategory } from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import type { CentralTabProps } from '../CentralHomePage';
import { baseParams, centralPaths, type CentralParams } from '../centralPaths';
import { AuditStatusBadge } from '../shared';

/**
 * Aba Grupos: grupos flexíveis (por que/como o ativo é usado), distintos da
 * classificação. Os grupos não são recortados pela árvore — a contagem de
 * membros respeita o escopo do usuário; "ver ativos" aplica o local selecionado.
 */
export function GroupsTab({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CentralParams>(params);
  const key = JSON.stringify(params);
  const creatable = services.groups.canCreate(access);

  useEffect(() => {
    setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const query = useServiceQuery(() => services.groups.list(access, { category: params.categoria, search: params.busca }), [key, access]);

  const applied: AppliedFilter[] = [];
  if (params.categoria) applied.push({ key: 'categoria', label: 'Categoria', value: GROUP_CATEGORY_LABEL[params.categoria] });
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });
  const items = query.data ?? [];

  return (
    <Stack>
      <FilterPanel
        applied={applied}
        onRemove={(k) => go({ ...params, [k]: undefined })}
        onApply={() => go(draft)}
        onClear={() => setDraft({ ...params, categoria: undefined, busca: undefined })}
      >
        <SelectField
          label="Categoria"
          emptyLabel="Todas"
          options={(Object.keys(GROUP_CATEGORY_LABEL) as GroupCategory[]).map((c) => ({ value: c, label: GROUP_CATEGORY_LABEL[c] }))}
          value={draft.categoria ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, categoria: (e.target.value || undefined) as GroupCategory | undefined }))}
        />
        <TextField label="Busca" placeholder="Nome ou descrição" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} />
      </FilterPanel>
      <Panel
        title={`Grupos${query.data ? ` (${items.length})` : ''}`}
        flush
        actions={
          creatable.corporate || creatable.local ? (
            <Button size="small" icon="plus" onClick={() => navigate(centralPaths.newGroup)}>
              Novo grupo
            </Button>
          ) : undefined
        }
      >
        {query.error ? (
          <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : items.length === 0 ? (
          <EmptyState compact icon="object-group" title="Nenhum grupo encontrado." />
        ) : (
          <div className={t.tableWrap}>
            <table className={t.table}>
              <caption className="visually-hidden">Grupos de ativos</caption>
              <thead>
                <tr>
                  <th scope="col">Grupo</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Administrado por</th>
                  <th scope="col">Membros</th>
                  <th scope="col">Exceções</th>
                  <th scope="col">Auditoria</th>
                  <th scope="col">
                    <span className="visually-hidden">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ group, memberCount, exceptionCount, auditStatus }) => (
                  <tr key={group.id}>
                    <td style={{ minWidth: 240 }}>
                      <ContextLink to={centralPaths.group(group.id)}>{group.name}</ContextLink>
                      <div className="helper">
                        {group.rules.length} regra(s) · {group.manualInclusions.length} inclusão(ões) manual(is)
                        {group.scopeLocationId ? ' · grupo local' : ''}
                      </div>
                    </td>
                    <td>
                      <Badge tone={group.category === 'especializado' ? 'gray' : group.category === 'corporativo' ? 'blue' : 'green'}>
                        {GROUP_CATEGORY_LABEL[group.category]}
                      </Badge>
                    </td>
                    <td>{MODULES[group.ownerModule].name}</td>
                    <td>{memberCount}</td>
                    <td>{exceptionCount > 0 ? <Badge tone="yellow">{exceptionCount}</Badge> : 0}</td>
                    <td>
                      <AuditStatusBadge value={auditStatus} />
                    </td>
                    <td>
                      <Button size="small" variant="link" onClick={() => go({ ...baseParams(params), aba: 'ativos', grupo: group.id })}>
                        Ver ativos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="helper">
        Classificação diz o que o ativo é; grupos dizem por que ou como ele é usado. Compartilhar um grupo com um módulo não dispara ações: cada módulo
        consumidor precisa configurar sua reação.
      </p>
    </Stack>
  );
}
