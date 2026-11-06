import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '@/access';
import { Alert, Badge, Button, ErrorState, PageHeader, Panel, Stack, tableStyles as t, useToast } from '@/components/ui';
import { MODULES } from '@/modules/registry';
import type { ImportPreview, ImportResult } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useUnsavedChangesGuard } from '@/app/hooks/useUnsavedChangesGuard';
import { ContextLink, usePageLabel } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';
import { centralPaths } from './centralPaths';
import { errorMessage } from './shared';
import styles from './central.module.css';

/** Exemplo fictício: uma linha válida, uma com duplicidade de tag, uma semelhante e uma com erro. */
export const IMPORT_EXAMPLE = [
  'tag;nome;classificacao;local;criticidade;responsavel;descricao',
  'CHL-002;Chiller reserva — água gelada;Chillers;JOI-IND-MAQ;media;CA-10047;Chiller reserva (demonstração)',
  'GER-002;Gerador diesel 500 kVA;Geradores;JOI-IND-MAQ;alta;;Linha duplicada (demonstração)',
  'EXT-ADM-03;Extintor PQS 4 kg;Extintores;JOI-ADM-T;baixa;;Extintor do térreo (demonstração)',
  'BMB-020;Bomba jockey;Bombas;LOCAL-INEXISTENTE;alta;;Linha com erro (demonstração)',
].join('\n');

/**
 * Importação em lote com prévia (docs/09): valida colunas, classificação,
 * local, escopo e criticidade; sinaliza duplicidades por tag e por nome
 * semelhante. Nada é gravado antes da confirmação.
 */
export function ImportAssetsPage() {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const navigate = useNavigate();
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<ImportPreview>();
  const [decisions, setDecisions] = useState<Record<number, 'importar' | 'ignorar'>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult>();
  usePageLabel('Importar ativos');
  const guard = useUnsavedChangesGuard(Boolean(preview && !result));

  if (!can(access, 'central.manage')) {
    return (
      <Panel title="Acesso">
        <ErrorState kind={403} text="Seu perfil não pode alterar o cadastro da Central." />
      </Panel>
    );
  }

  const analyze = () => {
    setError(undefined);
    setResult(undefined);
    if (!csv.trim()) {
      setError('Cole o conteúdo do arquivo CSV ou use o exemplo.');
      return;
    }
    try {
      const p = services.central.previewImport(access, csv);
      if (p.rows.length === 0) {
        setError('O arquivo não tem linhas de dados (a primeira linha deve ser o cabeçalho).');
        return;
      }
      setPreview(p);
      setDecisions(Object.fromEntries(p.rows.map((r) => [r.line, r.defaultAction])));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await services.central.applyImport(access, preview, decisions);
      setResult(r);
      toast.show({
        tone: r.created.length > 0 ? 'success' : 'info',
        title: `${r.created.length} ativo(s) importado(s)`,
        message: `${r.skipped} linha(s) ignorada(s) · ${r.duplicatesAvoided} duplicidade(s) evitada(s).`,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toImport = preview ? preview.rows.filter((r) => decisions[r.line] === 'importar' && r.input && !r.duplicateOf).length : 0;

  return (
    <>
      <PageHeader
        title="Importar ativos"
        breadcrumb={[{ label: MODULES.central.name, to: '/central' }, { label: 'Importar ativos' }]}
        description="Importação em lote para o cadastro mestre, com prévia e verificação de duplicidades antes de gravar."
      />
      <Stack>
        {error && <Alert tone="error" title="Não foi possível analisar">{error}</Alert>}
        {result ? (
          <Panel
            title="Resultado da importação"
            footerEnd={
              <>
                <Button
                  variant="secondary"
                  icon="upload"
                  onClick={() => {
                    setCsv('');
                    setPreview(undefined);
                    setResult(undefined);
                  }}
                >
                  Nova importação
                </Button>
                <Button icon="cubes" onClick={() => navigate(centralPaths.home({ aba: 'ativos' }))}>
                  Ver ativos
                </Button>
              </>
            }
          >
            <p>
              <strong>{result.created.length}</strong> ativo(s) criado(s), <strong>{result.skipped}</strong> linha(s) ignorada(s),{' '}
              <strong>{result.duplicatesAvoided}</strong> duplicidade(s) evitada(s).
            </p>
            {result.created.length > 0 && (
              <ul className={styles.previewList}>
                {result.created.map((a) => (
                  <li key={a.id}>
                    <ContextLink to={paths.asset(a.id)}>{a.tag}</ContextLink> · {a.name}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel
            title="Arquivo"
            footerStart={
              <Button variant="link" icon="file-text-o" onClick={() => setCsv(IMPORT_EXAMPLE)}>
                Usar exemplo
              </Button>
            }
            footerEnd={
              <Button icon="search" onClick={analyze}>
                Analisar arquivo
              </Button>
            }
          >
            <p className="helper" style={{ marginBottom: 8 }}>
              Cole o conteúdo CSV (separador ; ou ,). Colunas obrigatórias: <code>tag, nome, classificacao, local, criticidade</code>. Opcionais:{' '}
              <code>responsavel</code> (matrícula ou e-mail) e <code>descricao</code>. O local aceita código ou nome. Upload de arquivo é simulado por colagem.
            </p>
            <label htmlFor="csv-input" className="visually-hidden">
              Conteúdo CSV
            </label>
            <textarea
              id="csv-input"
              className={`${styles.textarea} ${styles.mono}`}
              style={{ minHeight: 160 }}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(undefined);
              }}
            />
          </Panel>
        )}

        {preview && !result && (
          <Panel
            title={`Prévia (${preview.rows.length} linhas)`}
            flush
            footerStart={
              <span className="helper">
                {preview.validCount} válida(s) · {preview.errorCount} com erro · {preview.duplicateCount} com possível duplicidade
              </span>
            }
            footerEnd={
              <Button icon="check" loading={busy} disabled={toImport === 0} onClick={apply}>
                Importar {toImport} ativo(s)
              </Button>
            }
          >
            <div className={t.tableWrap}>
              <table className={t.table}>
                <caption className="visually-hidden">Prévia da importação</caption>
                <thead>
                  <tr>
                    <th scope="col">Linha</th>
                    <th scope="col">Tag</th>
                    <th scope="col">Nome</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => {
                    const blocked = !r.input || Boolean(r.duplicateOf);
                    return (
                      <tr key={r.line} className={r.errors.length ? styles.rowError : r.warnings.length || r.duplicateOf ? styles.rowWarn : undefined}>
                        <td>{r.line}</td>
                        <td>{r.values.tag || '—'}</td>
                        <td>{r.values.nome || '—'}</td>
                        <td style={{ minWidth: 260 }}>
                          {r.errors.length === 0 && !r.duplicateOf && r.warnings.length === 0 && <Badge tone="green">Pronta para importar</Badge>}
                          {r.duplicateOf && (
                            <div>
                              <Badge tone="yellow">Duplicidade</Badge>{' '}
                              <span className="helper">
                                Tag já cadastrada: <ContextLink to={paths.asset(r.duplicateOf.id)}>{r.duplicateOf.tag}</ContextLink>
                              </span>
                            </div>
                          )}
                          {r.errors.map((e) => (
                            <div key={e} style={{ color: 'var(--sds-red-text)' }}>
                              {e}
                            </div>
                          ))}
                          {r.warnings.map((w) => (
                            <div key={w} className="helper">
                              {w}
                            </div>
                          ))}
                        </td>
                        <td>
                          <select
                            aria-label={`Ação para a linha ${r.line}`}
                            disabled={blocked}
                            value={blocked ? 'ignorar' : decisions[r.line]}
                            onChange={(e) => setDecisions((d) => ({ ...d, [r.line]: e.target.value as 'importar' | 'ignorar' }))}
                            style={{ minHeight: 30, borderRadius: 3, border: '1px solid var(--sds-border-strong)', padding: '2px 8px' }}
                          >
                            <option value="importar">Importar</option>
                            <option value="ignorar">Ignorar</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </Stack>
      {guard}
    </>
  );
}
