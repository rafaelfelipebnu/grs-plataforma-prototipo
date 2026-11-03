import { useEffect, useState } from 'react';
import { Button, Modal, SelectField, TextField } from '@/components/ui';
import { SEVERITY_LABEL } from '@/components/domain';
import {
  CRITICALITY_LABEL,
  DASHBOARD_AREAS,
  DASHBOARD_AREA_LABEL,
  PERIOD_LABEL,
  REFRESH_LABEL,
  WIDGET_SIZE_LABEL,
  type Criticality,
  type DashboardArea,
  type Period,
  type RefreshMode,
  type Severity,
  type WidgetConfig,
  type WidgetInstance,
  type WidgetSize,
} from '@/domain';
import { useLocationOptions } from '@/app/hooks/useLocationOptions';
import { WIDGET_CATALOG } from './catalog';

interface Props {
  instance: WidgetInstance | null;
  onClose: () => void;
  onApply: (id: string, patch: { area: DashboardArea; size: WidgetSize; config: WidgetConfig }) => void;
}

const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baixa'];

/** Configuração individual do widget: período, local, criticidade, quantidade e atualização (docs/03). */
export function WidgetConfigModal({ instance, onClose, onApply }: Props) {
  const locationOptions = useLocationOptions(3);
  const [config, setConfig] = useState<WidgetConfig>({});
  const [size, setSize] = useState<WidgetSize>(6);
  const [area, setArea] = useState<DashboardArea>('resumo');
  const [limitText, setLimitText] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!instance) return;
    setConfig(structuredClone(instance.config));
    setSize(instance.size);
    setArea(instance.area);
    setLimitText(instance.config.limit !== undefined ? String(instance.config.limit) : '');
    setTouched(false);
  }, [instance]);

  if (!instance) return null;
  const def = WIDGET_CATALOG[instance.type];
  const has = (f: (typeof def.configFields)[number]) => def.configFields.includes(f);
  const limit = Number(limitText);
  const limitError = has('limit') && (!Number.isInteger(limit) || limit < 1 || limit > 20) ? 'Informe um número inteiro entre 1 e 20.' : undefined;

  const apply = () => {
    setTouched(true);
    if (limitError) return;
    onApply(instance.id, { area, size, config: { ...config, limit: has('limit') ? limit : config.limit } });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configurar: ${def.name}`}
      footerStart={
        <Button variant="link" onClick={onClose}>
          Cancelar
        </Button>
      }
      footerEnd={
        <Button icon="check" onClick={apply}>
          Aplicar
        </Button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        <SelectField label="Área" value={area} onChange={(e) => setArea(e.target.value as DashboardArea)} options={DASHBOARD_AREAS.map((a) => ({ value: a, label: DASHBOARD_AREA_LABEL[a] }))} />
        <SelectField
          label="Tamanho"
          value={String(size)}
          onChange={(e) => setSize(Number(e.target.value) as WidgetSize)}
          options={def.allowedSizes.map((s) => ({ value: String(s), label: WIDGET_SIZE_LABEL[s] }))}
        />
        {has('location') && (
          <SelectField
            label="Local"
            emptyLabel="Localização do cabeçalho"
            value={config.locationId ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, locationId: e.target.value || null }))}
            options={locationOptions}
            helper="Inclui os locais descendentes."
          />
        )}
        {has('period') && (
          <SelectField
            label="Período"
            value={config.period ?? '24h'}
            onChange={(e) => setConfig((c) => ({ ...c, period: e.target.value as Period }))}
            options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />
        )}
        {has('minSeverity') && (
          <SelectField
            label="Severidade mínima"
            emptyLabel="Todas"
            value={config.minSeverity ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, minSeverity: (e.target.value || undefined) as Severity | undefined }))}
            options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))}
          />
        )}
        {has('minCriticality') && (
          <SelectField
            label="Criticidade mínima do ativo"
            value={config.minCriticality ?? 'alta'}
            onChange={(e) => setConfig((c) => ({ ...c, minCriticality: e.target.value as Criticality }))}
            options={(['alta', 'media', 'baixa'] as Criticality[]).map((c) => ({ value: c, label: CRITICALITY_LABEL[c] }))}
          />
        )}
        {has('statusFilter') && (
          <SelectField
            label="Status"
            value={config.statusFilter ?? 'ativos'}
            onChange={(e) => setConfig((c) => ({ ...c, statusFilter: e.target.value as 'ativos' | 'todos' }))}
            options={[
              { value: 'ativos', label: 'Somente ativos' },
              { value: 'todos', label: 'Ativos e reconhecidos' },
            ]}
          />
        )}
        {has('limit') && (
          <TextField
            label="Quantidade de itens"
            type="number"
            min={1}
            max={20}
            required
            value={limitText}
            onChange={(e) => setLimitText(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched ? limitError : undefined}
          />
        )}
        {has('refresh') && (
          <SelectField
            label="Atualização"
            value={config.refresh ?? 'tempo-real'}
            onChange={(e) => setConfig((c) => ({ ...c, refresh: e.target.value as RefreshMode }))}
            options={(Object.keys(REFRESH_LABEL) as RefreshMode[]).map((r) => ({ value: r, label: REFRESH_LABEL[r] }))}
          />
        )}
      </div>
    </Modal>
  );
}
