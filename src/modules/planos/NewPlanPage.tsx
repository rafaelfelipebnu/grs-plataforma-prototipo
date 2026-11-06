import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isModuleAvailable } from '@/access';
import { Alert, Button, Checkbox, ErrorState, LoadingState, PageHeader, Panel, SelectField, TextField, useToast } from '@/components/ui';
import { EFFECTIVENESS_LABEL } from '@/domain';
import { errorMessage } from '@/modules/central/shared';
import { ProvisionalTag, TextArea } from '@/modules/manutencao/shared';
import type { PlanDetail } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { useServiceQuery } from '@/app/providers/useServiceQuery';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import { PlansGate, planPaths } from './shared';

/** Criação de plano: a partir de ocorrência, como continuação de outro plano (DP-23) ou diretamente. */
export function NewPlanPage() {
  const access = useAccess();
  const services = useServices();
  const [sp] = useSearchParams();
  usePageLabel('Novo plano de ação');
  const relatedId = sp.get('relacionado');
  const related = useServiceQuery(() => (relatedId ? services.plans.get(access, relatedId) : Promise.resolve(null)), [relatedId, access]);
  return (
    <PlansGate title="Novo plano de ação">
      <PageHeader title="Novo plano de ação" breadcrumb={[{ label: 'Planos de ação', to: planPaths.list }, { label: 'Novo' }]} description="O plano nasce em Rascunho. Para ativar: responsável, prazo global e ao menos uma ação com executor e prazo." />
      {!services.plans.permissions(access).manage ? (
        <Panel title="Acesso">
          <ErrorState kind={403} text="Seu perfil não cria planos de ação." />
        </Panel>
      ) : relatedId && related.data === undefined && !related.error ? (
        <LoadingState />
      ) : related.error ? (
        <Panel title="Plano anterior">
          <ErrorState kind={404} text={related.error.message} />
        </Panel>
      ) : (
        <PlanForm occurrenceId={sp.get('ocorrencia') ?? undefined} related={related.data ?? undefined} />
      )}
    </PlansGate>
  );
}

function PlanForm({ occurrenceId, related }: { occurrenceId?: string; related?: PlanDetail }) {
  const access = useAccess();
  const services = useServices();
  const navigate = useNavigate();
  const toast = useToast();
  const locationOptions = useLocationOptions(6);
  const occurrence = useMemo(() => (occurrenceId ? services.occurrences.requestPrefill(access, occurrenceId) : null), [occurrenceId, services, access]);
  const relatedLink = related?.links[0];

  const [title, setTitle] = useState(occurrence ? `Tratamento — ${occurrence.code}` : related ? `${related.plan.title} (continuação)` : '');
  const [objective, setObjective] = useState(occurrence?.description ?? related?.plan.objective ?? '');
  const [locationId, setLocationId] = useState(occurrence?.locationId ?? related?.plan.locationId ?? '');
  const [assetId] = useState(occurrence?.assetId ?? related?.plan.assetId);
  const [responsible, setResponsible] = useState(access.user.id);
  const [dueDate, setDueDate] = useState('');
  const [finalApproval, setFinalApproval] = useState(false);
  const [approver, setApprover] = useState('');
  const [evaluator, setEvaluator] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [evaluationApprover, setEvaluationApprover] = useState('');
  const [copyLink, setCopyLink] = useState(Boolean(relatedLink));
  const [linkJustification, setLinkJustification] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const opts = (role: 'manage' | 'approve' | 'evaluate') => (locationId ? services.plans.peopleOptions(access, locationId, role).map((p) => ({ value: p.userId, label: p.name })) : []);
  const linkOccurrenceId = occurrence?.id ?? (copyLink ? relatedLink?.occurrenceId : undefined);
  const occurrenceStatus = linkOccurrenceId ? services.plans.occurrenceOptions(access).find((o) => o.id === linkOccurrenceId)?.status : undefined;

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const plan = await services.plans.create(access, {
        title,
        objective,
        locationId,
        assetId,
        responsibleUserId: responsible,
        dueDate,
        approvalMode: finalApproval ? 'final' : 'nenhuma',
        approverUserId: finalApproval ? approver : undefined,
        evaluatorUserId: evaluator || undefined,
        evaluationDueDate: evaluationDate || undefined,
        evaluationApproverUserId: evaluationApprover || undefined,
        occurrenceId: linkOccurrenceId,
        linkJustification: linkJustification || undefined,
        relatedPlanId: related?.plan.id,
      });
      toast.show({ tone: 'success', title: `Plano ${plan.code} criado em Rascunho`, message: 'Inclua as ações e ative o plano.' });
      navigate(planPaths.detail(plan.id), { replace: true });
    } catch (e) {
      setError(errorMessage(e) ?? 'Não foi possível criar o plano.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Dados do plano"
      footerStart={
        <Button variant="link" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      }
      footerEnd={
        <Button icon="save" loading={busy} onClick={submit}>
          Criar plano
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        {occurrence && (
          <Alert tone="info">
            Plano vinculado à ocorrência <strong>{occurrence.code}</strong>. A origem fica registrada e imutável; o plano tem ciclo próprio e não conclui a ocorrência.
          </Alert>
        )}
        {related && (
          <Alert tone="info">
            Continuação do plano <strong>{related.plan.code}</strong> (eficácia {EFFECTIVENESS_LABEL[related.plan.effectiveness!.result!]}). O plano anterior permanece Concluído; a relação fica no histórico dos dois (DP-23).
          </Alert>
        )}
        {related && relatedLink && (
          <div>
            <Checkbox
              label={`Vincular também à ocorrência ${relatedLink.referenceCode} do plano anterior`}
              checked={copyLink}
              onChange={(e) => setCopyLink(e.target.checked)}
              description="Sugestão com confirmação: o vínculo passa a contar para a exigência de plano da ocorrência (DP-10a)."
            />
            <ProvisionalTag code="P-72">Herança de vínculo provisória</ProvisionalTag>
          </div>
        )}
        <TextField label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea id="plan-objective" label="Objetivo" required value={objective} onChange={setObjective} />
        <SelectField label="Local" required emptyLabel="Selecione" options={locationOptions} value={locationId} onChange={(e) => setLocationId(e.target.value)} helper="Contexto do plano: define quem pode vê-lo (escopo)." />
        <SelectField label="Responsável do plano" required emptyLabel="Selecione" options={opts('manage')} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        <TextField label="Prazo global" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div>
          <Checkbox label="Exige aprovação final" checked={finalApproval} onChange={(e) => setFinalApproval(e.target.checked)} />
          <ProvisionalTag code="P-71">Só "nenhuma" ou "final" no protótipo</ProvisionalTag>
        </div>
        {finalApproval && <SelectField label="Aprovador do plano" required emptyLabel="Selecione" options={opts('approve')} value={approver} onChange={(e) => setApprover(e.target.value)} />}
        <SelectField label="Avaliador de eficácia" emptyLabel="Definir depois (obrigatório para concluir)" options={opts('evaluate')} value={evaluator} onChange={(e) => setEvaluator(e.target.value)} />
        <TextField label="Data prevista da avaliação" type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} helper="Obrigatória na conclusão do plano (D-013); sem prazo padrão." />
        <SelectField label="Aprovador da avaliação (opcional)" emptyLabel="Sem aprovação da avaliação" options={opts('approve')} value={evaluationApprover} onChange={(e) => setEvaluationApprover(e.target.value)} />
        {linkOccurrenceId && occurrenceStatus === 'concluida' && (
          <TextArea id="link-just" label="Justificativa do vínculo (ocorrência concluída)" required value={linkJustification} onChange={setLinkJustification} helper="DP-08: o vínculo não reabre nem altera a ocorrência concluída." />
        )}
        {!isModuleAvailable(access, 'ocorrencias') && <p className="helper">Sem acesso à Gestão de Ocorrências: o plano é criado sem vínculo.</p>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Panel>
  );
}
