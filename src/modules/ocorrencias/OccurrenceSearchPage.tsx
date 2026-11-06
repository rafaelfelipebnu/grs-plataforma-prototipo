import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, EmptyState, ErrorState, LoadingState, Modal, PageHeader, Paginator, Panel, tableStyles as t, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import {
  OCCURRENCE_ORIGIN_LABEL,
  OCCURRENCE_PRIORITIES,
  OCCURRENCE_PRIORITY_LABEL,
  OCCURRENCE_STATUS_LABEL,
  type OccurrenceOrigin,
  type OccurrencePriority,
  type OccurrenceStatus,
} from '@/domain';
import { MODULES } from '@/modules/registry';
import { isServiceError, type OccurrenceBatchResult } from '@/services';
import { ActionModal, TextArea } from '@/modules/manutencao/shared';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { OccurrenceNav, OccurrencePriorityBadge, OccurrenceStatusBadge, occurrencePaths, occurrenceStyles as s } from './shared';

const PAGE_SIZE = 10;
const selectStyle = { minHeight: 32, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' } as const;
const FILTERS = ['status', 'prioridade', 'tipo', 'origem', 'busca'] as const;

/** Consulta de ocorrências (existente): filtros, seleção e ações em lote. */
export function OccurrenceSearchPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const { activeLocationId } = useSession();
  usePageLabel('Consulta de ocorrências');
  const perm = services.occurrences.permissions(access);
  const types = services.occurrences.types(access);
  const values = Object.fromEntries(FILTERS.map((k) => [k, sp.get(k) ?? ''])) as Record<(typeof FILTERS)[number], string>;
  const page = Number(sp.get('pagina')) || 1;
  const set = (next: Partial<Record<(typeof FILTERS)[number] | 'pagina', string>>) => {
    const merged = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    if (!('pagina' in next)) merged.delete('pagina');
    navigate(`${location.pathname}${merged.toString() ? `?${merged}` : ''}`, { replace: true, state: location.state });
  };
  const [search, setSearch] = useState(values.busca);
  useEffect(() => setSearch(values.busca), [values.busca]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<'tratar' | 'concluir' | null>(null);
  const [result, setResult] = useState<{ title: string; data: OccurrenceBatchResult } | null>(null);
  const [text, setText] = useState('');

  const query = useServiceQuery(
    () =>
      services.occurrences.list(access, {
        status: (values.status || undefined) as OccurrenceStatus | 'abertas' | undefined,
        priority: (values.prioridade || undefined) as OccurrencePriority | undefined,
        typeId: values.tipo || undefined,
        origin: (values.origem || undefined) as OccurrenceOrigin | undefined,
        search: values.busca || undefined,
        locationId: activeLocationId ?? undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [sp.toString(), access, activeLocationId],
  );
  useEffect(() => setSelected(new Set()), [sp.toString()]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ids = Array.from(selected);

  return (
    <>
      <PageHeader
        title="Consulta de ocorrências"
        breadcrumb={[{ label: MODULES.ocorrencias.name, to: occurrencePaths.panel }, { label: 'Consulta' }]}
        description="Selecione ocorrências para tratar (trâmite em lote) ou concluir em lote. As que não atendem às condições ficam abertas, identificadas com o motivo."
      />
      <OccurrenceNav />
      <Panel title={`Ocorrências${query.data ? ` (${query.data.total})` : ''}`} flush>
        <div className={t.tableHeading}>
          <form
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
            onSubmit={(e) => {
              e.preventDefault();
              set({ busca: search });
            }}
          >
            <select aria-label="Status" value={values.status} onChange={(e) => set({ status: e.target.value })} style={selectStyle}>
              <option value="">Todos os status</option>
              <option value="abertas">Abertas (não concluídas)</option>
              {(Object.keys(OCCURRENCE_STATUS_LABEL) as OccurrenceStatus[]).map((x) => (
                <option key={x} value={x}>
                  {OCCURRENCE_STATUS_LABEL[x]}
                </option>
              ))}
            </select>
            <select aria-label="Prioridade" value={values.prioridade} onChange={(e) => set({ prioridade: e.target.value })} style={selectStyle}>
              <option value="">Todas as prioridades</option>
              {OCCURRENCE_PRIORITIES.map((x) => (
                <option key={x} value={x}>
                  {OCCURRENCE_PRIORITY_LABEL[x]}
                </option>
              ))}
            </select>
            <select aria-label="Tipo" value={values.tipo} onChange={(e) => set({ tipo: e.target.value })} style={selectStyle}>
              <option value="">Todos os tipos</option>
              {types.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select aria-label="Origem" value={values.origem} onChange={(e) => set({ origem: e.target.value })} style={selectStyle}>
              <option value="">Todas as origens</option>
              {(Object.keys(OCCURRENCE_ORIGIN_LABEL) as OccurrenceOrigin[]).map((x) => (
                <option key={x} value={x}>
                  {OCCURRENCE_ORIGIN_LABEL[x]}
                </option>
              ))}
            </select>
            <input aria-label="Buscar ocorrências" type="search" placeholder="Identificador, descrição, tipo, ativo" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...selectStyle, minWidth: 220 }} />
            <Button type="submit" size="small" variant="secondary" icon="search">
              Filtrar
            </Button>
          </form>
        </div>
        {ids.length > 0 && (
          <div className={s.actionsBar} style={{ padding: '8px 16px', borderBottom: '1px solid var(--sds-border)' }}>
            <strong>{ids.length} selecionada(s)</strong>
            {perm.treat && (
              <Button size="small" variant="secondary" icon="comment" onClick={() => { setText(''); setDialog('tratar'); }}>
                Tratar ocorrências
              </Button>
            )}
            {perm.conclude && (
              <Button size="small" icon="check" onClick={() => setDialog('concluir')}>
                Concluir ocorrência(s)
              </Button>
            )}
          </div>
        )}
        {query.error ? (
          <ErrorState compact kind={isServiceError(query.error) && query.error.code === 'FORBIDDEN' ? 403 : 500} text={query.error.message} />
        ) : !query.data ? (
          <LoadingState compact />
        ) : query.data.items.length === 0 ? (
          <EmptyState compact icon="search" title="Nenhuma ocorrência encontrada." text="Ajuste os filtros." />
        ) : (
          <>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Ocorrências</caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 36 }}>
                      <span className="visually-hidden">Selecionar</span>
                    </th>
                    <th scope="col">Ocorrência</th>
                    <th scope="col">Local</th>
                    <th scope="col">Prioridade</th>
                    <th scope="col">Status</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map(({ occurrence: o, type, locationPath, asset, awaitingApproval }) => (
                    <tr key={o.id}>
                      <td>
                        <input type="checkbox" aria-label={`Selecionar ${o.code}`} checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <ContextLink to={occurrencePaths.detail(o.id)}>{o.code}</ContextLink> — {type.name}
                        <div className="helper">{o.description.length > 70 ? `${o.description.slice(0, 67)}...` : o.description}</div>
                      </td>
                      <td>
                        {locationPath.at(-1)?.name}
                        {asset && <div className="helper">{asset.tag}</div>}
                      </td>
                      <td>
                        <OccurrencePriorityBadge value={o.priority} />
                      </td>
                      <td>
                        <OccurrenceStatusBadge value={o.status} />
                        {awaitingApproval && <div className="helper">Aguardando aprovação</div>}
                      </td>
                      <td className="muted">{OCCURRENCE_ORIGIN_LABEL[o.origin]}</td>
                      <td>{formatDateTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set({ pagina: String(p) })} />
          </>
        )}
      </Panel>

      <ActionModal
        open={dialog === 'tratar'}
        title="Tratar ocorrências"
        confirmLabel="Registrar trâmite"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          const data = await services.occurrences.addProceedingBatch(access, ids, text);
          setDialog(null);
          setSelected(new Set());
          setResult({ title: 'Trâmite em lote', data });
          toast.show({ tone: 'success', title: `Trâmite registrado em ${data.done.length} ocorrência(s)` });
        }}
      >
        <p className="helper">O mesmo trâmite é registrado em cada ocorrência selecionada que não estiver concluída. Ocorrências Sem tratamento passam a Em andamento.</p>
        <TextArea id="batch-text" label="Descrição" required value={text} onChange={setText} />
      </ActionModal>
      <ActionModal
        open={dialog === 'concluir'}
        title="Concluir ocorrência(s)"
        confirmLabel="Concluir"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          const data = await services.occurrences.concludeBatch(access, ids);
          setDialog(null);
          setSelected(new Set());
          setResult({ title: 'Conclusão em lote', data });
          toast.show({ tone: data.kept.length ? 'warning' : 'success', title: `${data.done.length} concluída(s), ${data.kept.length} mantida(s) aberta(s)` });
        }}
      >
        <Alert tone="warning" title="Impactos">
          Concluir encerra o tempo de solução e retira as ocorrências de "Ocorrências em aberto". Não há reabertura. Ocorrências em pausa, sem trâmite ou cujo tipo exige
          justificativa, evidência ou aprovação ficam abertas e serão listadas com o motivo.
        </Alert>
      </ActionModal>
      <Modal
        open={result !== null}
        title={result?.title ?? ''}
        onClose={() => setResult(null)}
        footerEnd={<Button onClick={() => setResult(null)}>Fechar</Button>}
      >
        {result && (
          <div>
            <p>
              <strong>{result.data.done.length}</strong> processada(s): {result.data.done.map((d) => d.code).join(', ') || '—'}
            </p>
            {result.data.kept.length > 0 && (
              <>
                <p>
                  <strong>{result.data.kept.length}</strong> mantida(s) sem alteração:
                </p>
                <ul>
                  {result.data.kept.map((k) => (
                    <li key={k.id}>
                      <ContextLink to={occurrencePaths.detail(k.id)}>{k.code}</ContextLink> — {k.reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
