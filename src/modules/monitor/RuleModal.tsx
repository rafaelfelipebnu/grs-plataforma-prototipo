import { useEffect, useMemo, useState } from 'react';
import { SelectField, TextField, useToast } from '@/components/ui';
import { SEVERITY_LABEL } from '@/components/domain';
import { RULE_OPERATOR_LABEL, type MonitoringRule, type RuleOperator, type Severity } from '@/domain';
import type { RuleInput } from '@/services';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { ReasonModal } from '@/modules/central/shared';

const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baixa', 'informativa'];

interface RuleModalProps {
  open: boolean;
  onClose: () => void;
  /** Regra em edição; ausente = nova. */
  rule?: MonitoringRule;
  /** Ponto pré-selecionado (nova regra a partir do ponto). */
  pointId?: string;
}

/** Criação/edição de regra técnica: comparação simples com limite (P-42). */
export function RuleModal({ open, onClose, rule, pointId }: RuleModalProps) {
  const access = useAccess();
  const services = useServices();
  const toast = useToast();
  const options = useMemo(() => (open ? services.monitor.pointOptions(access) : []), [open, services, access]);
  const empty: RuleInput = { name: '', pointId: pointId ?? '', operator: 'maior', threshold: '', severity: 'media' };
  const [form, setForm] = useState<RuleInput>(empty);

  useEffect(() => {
    if (open) setForm(rule ? { name: rule.name, pointId: rule.pointId, operator: rule.operator, threshold: String(rule.threshold), severity: rule.severity } : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule, pointId]);

  const selected = options.find((o) => o.point.id === form.pointId);

  return (
    <ReasonModal
      open={open}
      title={rule ? 'Editar regra' : 'Nova regra de monitoramento'}
      confirmLabel={rule ? 'Salvar regra' : 'Criar regra'}
      onCancel={onClose}
      onConfirm={async (reason) => {
        const result = rule ? await services.monitor.updateRule(access, rule.id, form, reason) : await services.monitor.createRule(access, form, reason);
        toast.show({
          tone: result.triggered.length ? 'warning' : 'success',
          title: rule ? 'Regra atualizada' : 'Regra criada',
          message: result.triggered.length ? `O valor atual já viola a regra: alerta ${result.triggered[0]!.code} gerado.` : 'O valor atual está dentro do limite.',
        });
        onClose();
      }}
    >
      <TextField label="Nome" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <SelectField
        label="Ponto de dado"
        required
        emptyLabel="Selecione"
        value={form.pointId}
        onChange={(e) => setForm((f) => ({ ...f, pointId: e.target.value }))}
        options={options.map(({ point, device }) => ({ value: point.id, label: `${device.name} › ${point.name}${point.unit ? ` (${point.unit})` : ''}` }))}
        helper={selected ? `Valor atual: ${String(selected.point.value)} ${selected.point.unit}` : undefined}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SelectField
          label="Condição"
          required
          value={form.operator}
          onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value as RuleOperator }))}
          options={(Object.keys(RULE_OPERATOR_LABEL) as RuleOperator[]).map((o) => ({ value: o, label: RULE_OPERATOR_LABEL[o] }))}
        />
        <TextField label="Limite" required value={String(form.threshold)} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} helper={selected?.point.unit || undefined} />
      </div>
      <SelectField
        label="Severidade do alerta"
        required
        value={form.severity}
        onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}
        options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))}
      />
      <p className="helper">
        A regra é avaliada a cada leitura; um alerta ativo por regra. Histerese, janelas de tempo, supressão e escalonamento não fazem parte desta demonstração.
      </p>
    </ReasonModal>
  );
}
