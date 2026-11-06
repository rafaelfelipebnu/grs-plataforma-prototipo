import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '@/access';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterPanel,
  LoadingState,
  Paginator,
  Panel,
  SelectField,
  Stack,
  TextField,
  tableStyles as t,
  type AppliedFilter,
} from '@/components/ui';
import { ConditionBadge, CriticalityBadge, LocationPath } from '@/components/domain';
import { CONDITION_LABEL, CRITICALITY_LABEL, type Criticality, type OperationalCondition } from '@/domain';
import { isServiceError, type AssetSort } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import type { CentralTabProps } from '../CentralHomePage';
import { centralPaths, type CentralParams } from '../centralPaths';
import styles from '../central.module.css';

const PAGE_SIZE = 10;

/** Aba Ativos: lista e cartões, filtros e permissões (docs/02). */
export function AssetsTab({ params, go }: CentralTabProps) {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CentralParams>(params);
  const key = JSON.stringify(params);

  useEffect(() => {
    setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const classifications = services.central.classifications();
  const classificationOptions = useMemo(() => {
    const depth = (id: string | null): number => {
      const c = classifications.find((x) => x.id === id);
      return c?.parentId ? 1 + depth(c.parentId) : 0;
    };
    const ordered: typeof classifications = [];
    const add = (parentId: string | null) =>
      classifications.filter((c) => c.parentId === parentId).forEach((c) => {
        ordered.push(c);
        add(c.id);
      });
    add(null);
    return ordered.map((c) => ({ value: c.id, label: `${'— '.repeat(depth(c.id))}${c.name}` }));
  }, [classifications]);

  const groupsQuery = useServiceQuery(() => services.groups.list(access, {}), [access]);
  const groupOptions = (groupsQuery.data ?? []).map((g) => ({ value: g.group.id, label: g.group.name }));

  const query = useServiceQuery(
    () =>
      services.central.listAssets(access, {
        locationId: params.local,
        includeDescendants: !params.somente,
        search: params.busca,
        classificationId: params.classificacao,
        criticality: params.criticidade,
        condition: params.condicao,
        withDevice: params.dispositivo,
        groupId: params.grupo,
        sort: params.ordem,
        page: params.pagina,
        pageSize: PAGE_SIZE,
      }),
    [key, access],
  );

  const applied: AppliedFilter[] = [];
  if (params.busca) applied.push({ key: 'busca', label: 'Busca', value: params.busca });
  if (params.classificacao)
    applied.push({ key: 'classificacao', label: 'Classificação', value: classifications.find((c) => c.id === params.classificacao)?.name ?? params.classificacao });
  if (params.criticidade) applied.push({ key: 'criticidade', label: 'Criticidade', value: CRITICALITY_LABEL[params.criticidade] });
  if (params.condicao) applied.push({ key: 'condicao', label: 'Condição', value: CONDITION_LABEL[params.condicao] });
  if (params.dispositivo) applied.push({ key: 'dispositivo', label: 'Dispositivo', value: params.dispositivo === 'com' ? 'Com dispositivo' : 'Sem dispositivo' });
  if (params.grupo) applied.push({ key: 'grupo', label: 'Grupo', value: groupOptions.find((g) => g.value === params.grupo)?.label ?? params.grupo });

  const filterKeys = ['busca', 'classificacao', 'criticidade', 'condicao', 'dispositivo', 'grupo'] as const;
  const cards = params.visao === 'cartoes';
  const manage = can(access, 'central.manage');
  const items = query.data?.items ?? [];

  return (
    <Stack>
      <FilterPanel
        applied={applied}
        onRemove={(k) => go({ ...params, [k]: undefined, pagina: 1 })}
        onApply={() => go({ ...draft, pagina: 1 })}
        onClear={() => setDraft({ ...params, ...Object.fromEntries(filterKeys.map((k) => [k, undefined])) })}
      >
        <TextField label="Busca" placeholder="Tag, nome ou descrição" value={draft.busca ?? ''} onChange={(e) => setDraft((d) => ({ ...d, busca: e.target.value || undefined }))} />
        <SelectField
          label="Classificação"
          emptyLabel="Todas"
          helper="Inclui as subclassificações."
          options={classificationOptions}
          value={draft.classificacao ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, classificacao: e.target.value || undefined }))}
        />
        <SelectField
          label="Criticidade"
          emptyLabel="Todas"
          options={(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((c) => ({ value: c, label: CRITICALITY_LABEL[c] }))}
          value={draft.criticidade ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, criticidade: (e.target.value || undefined) as Criticality | undefined }))}
        />
        <SelectField
          label="Condição operacional"
          emptyLabel="Todas"
          options={(Object.keys(CONDITION_LABEL) as OperationalCondition[]).map((c) => ({ value: c, label: CONDITION_LABEL[c] }))}
          value={draft.condicao ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, condicao: (e.target.value || undefined) as OperationalCondition | undefined }))}
        />
        <SelectField
          label="Dispositivo"
          emptyLabel="Todos"
          options={[
            { value: 'com', label: 'Com dispositivo' },
            { value: 'sem', label: 'Sem dispositivo' },
          ]}
          value={draft.dispositivo ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, dispositivo: (e.target.value || undefined) as 'com' | 'sem' | undefined }))}
        />
        <SelectField label="Grupo" emptyLabel="Todos" options={groupOptions} value={draft.grupo ?? ''} onChange={(e) => setDraft((d) => ({ ...d, grupo: e.target.value || undefined }))} />
      </FilterPanel>

      <Panel title={`Ativos${query.data ? ` (${query.data.total})` : ''}`} flush>
        <div className={t.tableHeading}>
          <div className={styles.scopeToggle} role="group" aria-label="Modo de exibição">
            <button type="button" aria-pressed={!cards} onClick={() => go({ ...params, visao: undefined })}>
              <i className="fa fa-list" aria-hidden="true" /> Lista
            </button>
            <button type="button" aria-pressed={cards} onClick={() => go({ ...params, visao: 'cartoes' })}>
              <i className="fa fa-th-large" aria-hidden="true" /> Cartões
            </button>
          </div>
          <div className={t.tableHeadingEnd}>
            <label className="helper" htmlFor="ordem-ativos">
              Ordenar por
            </label>
            <select
              id="ordem-ativos"
              value={params.ordem ?? 'tag'}
              onChange={(e) => go({ ...params, ordem: e.target.value === 'tag' ? undefined : (e.target.value as AssetSort), pagina: 1 })}
              style={{ minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
            >
              <option value="tag">Tag</option>
              <option value="condicao">Condição (mais grave primeiro)</option>
              <option value="criticidade">Criticidade (maior primeiro)</option>
            </select>
          </div>
        </div>
        {query.error ? (
          <ErrorState kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} compact text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon="cubes"
            title={applied.length ? 'Nenhum ativo encontrado para os filtros aplicados.' : 'Nenhum ativo cadastrado neste local.'}
            actions={
              manage ? (
                <Button icon="plus" onClick={() => navigate(centralPaths.newAsset(params.local))}>
                  Novo ativo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {cards ? (
              <div className={styles.cardGrid}>
                {items.map(({ asset, classificationName, locationPath, deviceCount, activeAlerts }) => (
                  <article key={asset.id} className={styles.assetCard}>
                    <ContextLink to={paths.asset(asset.id)} style={{ fontWeight: 600 }}>
                      {asset.tag} · {asset.name}
                    </ContextLink>
                    <span className="helper">{classificationName}</span>
                    <span className="helper">
                      <LocationPath path={locationPath} tail={2} />
                    </span>
                    <span className={styles.badges}>
                      <CriticalityBadge value={asset.criticality} />
                      <ConditionBadge value={asset.condition} />
                    </span>
                    <span className="helper">
                      {deviceCount} dispositivo(s) · {activeAlerts} alerta(s) ativo(s)
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <caption className="visually-hidden">Ativos</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ativo</th>
                      <th scope="col">Classificação</th>
                      <th scope="col">Localização principal</th>
                      <th scope="col">Criticidade</th>
                      <th scope="col">Condição</th>
                      <th scope="col">Dispositivos</th>
                      <th scope="col">Alertas ativos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ asset, classificationName, locationPath, deviceCount, activeAlerts }) => (
                      <tr key={asset.id}>
                        <td style={{ minWidth: 220 }}>
                          <ContextLink to={paths.asset(asset.id)}>{asset.tag}</ContextLink>
                          <div className="helper">{asset.name}</div>
                        </td>
                        <td>{classificationName}</td>
                        <td>
                          <LocationPath path={locationPath} tail={2} />
                        </td>
                        <td>
                          <CriticalityBadge value={asset.criticality} />
                        </td>
                        <td>
                          <ConditionBadge value={asset.condition} />
                        </td>
                        <td>{deviceCount}</td>
                        <td>{activeAlerts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => go({ ...params, pagina: p })} />
          </>
        )}
      </Panel>
    </Stack>
  );
}
