import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_CAPABILITIES, CAPABILITY_LABEL, COMMERCIAL_PLANS, PLAN_ORDER, hasActionPlanCapability } from '@/access';
import { Alert, Button, Checkbox, Modal, SelectField, useToast } from '@/components/ui';
import { formatDateTime } from '@/components/domain';
import type { CapabilityId, CommercialPlanId } from '@/domain';
import { isServiceError } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useDataVersion, useServices } from '@/app/providers/ServicesProvider';
import { resolveTargetPath } from '@/app/navigation/targets';

const ALL_CAPABILITIES = Object.keys(CAPABILITY_LABEL) as CapabilityId[];

/**
 * Controles da demonstração — ferramenta do FACILITADOR da validação, não uma
 * funcionalidade do produto. Permite trocar o perfil comercial, disparar
 * cenários e restaurar os dados.
 */
export function DemoControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const access = useAccess();
  const toast = useToast();
  const navigate = useNavigate();
  useDataVersion();
  const status = services.demo.status();

  const [planId, setPlanId] = useState<CommercialPlanId>(status.contract.planId);
  const [custom, setCustom] = useState<CapabilityId[]>(status.contract.capabilities);
  const [busy, setBusy] = useState<'contract' | 'scenario' | 'reset' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (open) {
      setPlanId(status.contract.planId);
      setCustom(status.contract.capabilities);
      setConfirmReset(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const plan = COMMERCIAL_PLANS[planId];
  const effective = planId === 'personalizado' ? Array.from(new Set([...BASE_CAPABILITIES, ...custom])) : Array.from(new Set([...BASE_CAPABILITIES, ...plan.capabilities]));

  const applyContract = async () => {
    setBusy('contract');
    try {
      const contract = await services.demo.setContract(planId, custom);
      toast.show({
        tone: 'success',
        title: `Perfil comercial ${COMMERCIAL_PLANS[contract.planId].name} aplicado`,
        message: `${contract.capabilities.length} capacidades contratadas.`,
      });
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const simulate = async () => {
    setBusy('scenario');
    try {
      const { eventId } = await services.demo.simulatePumpFailure();
      onClose();
      const path = resolveTargetPath({ kind: 'event', id: eventId }, access, services);
      toast.show({
        tone: 'info',
        title: 'Cenário A iniciado',
        message: 'Sinal simulado de falha enviado pelo CLP da bomba BMB-014.',
        action: path ? { label: 'Abrir evento', onClick: () => navigate(path) } : undefined,
      });
    } catch (error) {
      toast.show({ tone: 'warning', title: 'Cenário não iniciado', message: isServiceError(error) ? error.message : 'Erro inesperado.' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy('reset');
    try {
      await services.demo.reset();
      toast.show({ tone: 'success', title: 'Cenário de demonstração restaurado' });
      onClose();
      navigate('/');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Controles da demonstração"
      size="large"
      footerStart={
        <Button variant="link" onClick={onClose}>
          Fechar
        </Button>
      }
      footerEnd={
        <Button icon="check" onClick={applyContract} loading={busy === 'contract'}>
          Aplicar perfil comercial
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Alert tone="info">
          Ferramenta do facilitador da validação. Nada aqui representa uma funcionalidade do produto: todos os dados, dispositivos e
          integrações são simulados.
        </Alert>

        <section aria-labelledby="demo-plan">
          <h3 id="demo-plan" className="section-title" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            Perfil comercial (módulos contratados)
          </h3>
          <div style={{ maxWidth: 360 }}>
            <SelectField
              label="Perfil comercial"
              value={planId}
              onChange={(e) => setPlanId(e.target.value as CommercialPlanId)}
              options={PLAN_ORDER.map((id) => ({ value: id, label: COMMERCIAL_PLANS[id].name }))}
              helper={plan.description}
            />
          </div>
          {!plan.compositionConfirmed && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="warning" title="Composição provisória">
                A composição deste perfil comercial ainda não foi definida. Os módulos abaixo são uma suposição para a demonstração,
                pendente de validação comercial.
              </Alert>
            </div>
          )}
          <fieldset style={{ border: 0, padding: 0, margin: '16px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            <legend className="helper" style={{ marginBottom: 8 }}>
              {planId === 'personalizado' ? 'Selecione as capacidades contratadas' : 'Capacidades incluídas'}
            </legend>
            {ALL_CAPABILITIES.map((cap) => {
              const base = BASE_CAPABILITIES.includes(cap);
              return (
                <Checkbox
                  key={cap}
                  label={CAPABILITY_LABEL[cap]}
                  description={base ? 'Capacidade básica GRS' : undefined}
                  checked={effective.includes(cap)}
                  disabled={planId !== 'personalizado' || base}
                  onChange={(e) =>
                    setCustom((list) => (e.target.checked ? [...list, cap] : list.filter((c) => c !== cap)))
                  }
                />
              );
            })}
          </fieldset>
          <p className="helper" style={{ marginTop: 8 }}>
            Planos de ação: {hasActionPlanCapability({ planId, capabilities: effective }) ? 'habilitados' : 'não habilitados'} (exigem
            Ocorrências Avançadas, Gestão de Rotinas ou Gestão de Manutenção).
          </p>
        </section>

        <section aria-labelledby="demo-scenarios">
          <h3 id="demo-scenarios" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            Cenários
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Button variant="secondary" icon="bolt" onClick={simulate} loading={busy === 'scenario'} disabled={status.scenarioAPumpFailureActive}>
              Simular falha na bomba BMB-014
            </Button>
            <span className="helper">
              {status.scenarioAPumpFailureActive
                ? 'Cenário A em andamento. Restaure os dados para repetir.'
                : 'Cenário A: o Monitor recebe sinal de falha e o impacto em segurança é contextualizado.'}
            </span>
          </div>
        </section>

        <section aria-labelledby="demo-live">
          <h3 id="demo-live" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            Tempo real
          </h3>
          <Checkbox
            label="Simular passagens no Controle de Acesso"
            description="Gera uma passagem a cada 8 segundos para os widgets em tempo real."
            checked={status.liveSimulation}
            onChange={async (e) => {
              await services.demo.setLiveSimulation(e.target.checked);
              toast.show({ tone: 'success', title: e.target.checked ? 'Simulação em tempo real ligada' : 'Simulação em tempo real desligada' });
            }}
          />
        </section>

        <section aria-labelledby="demo-data">
          <h3 id="demo-data" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
            Dados da demonstração
          </h3>
          <p className="helper">
            Cenário carregado em {formatDateTime(status.seededAt)}.{' '}
            {status.persistenceAvailable
              ? 'Alterações são mantidas neste navegador até a restauração.'
              : 'O armazenamento local está indisponível: alterações valem apenas nesta sessão.'}
          </p>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {confirmReset ? (
              <>
                <span>Restaurar descarta todas as alterações feitas na demonstração.</span>
                <Button variant="danger" icon="undo" onClick={reset} loading={busy === 'reset'} data-autofocus>
                  Confirmar restauração
                </Button>
                <Button variant="link" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button variant="secondary" icon="undo" onClick={() => setConfirmReset(true)}>
                Restaurar cenário de demonstração
              </Button>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
