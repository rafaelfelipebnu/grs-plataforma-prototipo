import { Alert, Badge, PageHeader, Panel, Stack, tableStyles as t } from '@/components/ui';
import { CONCLUSION_CRITERION_LABEL, PLAN_REQUIREMENT_LABEL } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { OccurrenceNav, OccurrencePriorityBadge, occurrencePaths } from './shared';

/**
 * Tipos de ocorrência: campos existentes + condições opcionais de conclusão
 * (docs/06, DP-04). Somente consulta nesta entrega.
 */
export function OccurrenceTypesPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Tipos de ocorrência');
  const types = services.occurrences.types(access);
  const perm = services.occurrences.permissions(access);
  const yes = (v: boolean) => (v ? <Badge tone="blue">Sim</Badge> : <span className="muted">Não</span>);

  return (
    <>
      <PageHeader
        title="Tipos de ocorrência"
        breadcrumb={[{ label: MODULES.ocorrencias.name, to: occurrencePaths.panel }, { label: 'Tipos' }]}
        description="Configuração existente do tipo (prioridade padrão, monitorado, aviso sonoro, e-mails) e parâmetros opcionais de conclusão da Linha GRS."
      />
      <OccurrenceNav />
      <Stack>
        <Alert tone="info">
          {perm.configure ? 'A edição de tipos ' : 'A configuração de tipos é restrita ao administrador. A edição '}
          entra em entrega futura; nesta demonstração os tipos são consultados. "Exige reinspeção" será configurável com Gestão de Rotinas.
        </Alert>
        <Panel title={`Tipos (${types.length})`} flush>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <caption className="visually-hidden">Tipos de ocorrência</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Prioridade padrão</th>
                  <th scope="col">Monitorado</th>
                  <th scope="col">Aviso sonoro</th>
                  <th scope="col">E-mails notificados</th>
                  <th scope="col">Conclusão: evidência</th>
                  <th scope="col">Conclusão: justificativa</th>
                  <th scope="col">Critério de conclusão</th>
                  <th scope="col">Plano de ação</th>
                </tr>
              </thead>
              <tbody>
                {types.map((x) => (
                  <tr key={x.id}>
                    <td>{x.name}</td>
                    <td>
                      <OccurrencePriorityBadge value={x.defaultPriority} />
                    </td>
                    <td>{yes(x.monitored)}</td>
                    <td>{yes(x.warningSound)}</td>
                    <td className="muted">{x.notifiedEmails.join(', ') || '—'}</td>
                    <td>{yes(x.conclusion.requireEvidence)}</td>
                    <td>{yes(x.conclusion.requireJustification)}</td>
                    <td>{CONCLUSION_CRITERION_LABEL[x.conclusion.criterion]}</td>
                    <td>{PLAN_REQUIREMENT_LABEL[x.conclusion.requirePlan]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Stack>
    </>
  );
}
