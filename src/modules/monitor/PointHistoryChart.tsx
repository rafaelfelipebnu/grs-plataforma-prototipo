import { useId, useState } from 'react';
import { formatDateTime } from '@/components/domain';
import type { MonitoringRule, PointReading } from '@/domain';

interface Props {
  readings: PointReading[];
  unit: string;
  rules: MonitoringRule[];
}

const W = 640;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 28, left: 48 };

/**
 * Série temporal de um único ponto: linha de 2px, sem legenda (o título do
 * painel nomeia a série), limites numéricos das regras ativas como linhas de
 * referência e crosshair com tooltip ao passar o mouse.
 */
export function PointHistoryChart({ readings, unit, rules }: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const numeric = readings.filter((r): r is PointReading & { value: number } => typeof r.value === 'number');
  if (numeric.length < 2) return <p className="helper">Ponto não numérico: veja o histórico em tabela.</p>;

  const limits = rules.filter((r) => r.active && typeof r.threshold === 'number').map((r) => ({ rule: r, value: r.threshold as number }));
  const values = [...numeric.map((r) => r.value), ...limits.map((l) => l.value)];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  const t0 = Date.parse(numeric[0]!.at);
  const t1 = Date.parse(numeric[numeric.length - 1]!.at);
  const x = (at: string) => PAD.left + ((Date.parse(at) - t0) / Math.max(1, t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const path = numeric.map((r, i) => `${i ? 'L' : 'M'}${x(r.at).toFixed(1)},${y(r.value).toFixed(1)}`).join(' ');
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)).replace('.', ',');
  const active = hover !== null ? numeric[hover] : undefined;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (W - PAD.left - PAD.right) + PAD.left;
    let best = 0;
    numeric.forEach((r, i) => {
      if (Math.abs(x(r.at) - px) < Math.abs(x(numeric[best]!.at) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-labelledby={titleId} style={{ display: 'block', maxHeight: 240 }}>
        <title id={titleId}>Histórico das últimas leituras ({unit || 'sem unidade'})</title>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--sds-border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--sds-text-support)">
              {fmt(v)}
            </text>
          </g>
        ))}
        {limits.map((l) => (
          <g key={l.rule.id}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(l.value)} y2={y(l.value)} stroke="var(--sds-text-support)" strokeWidth={1} strokeDasharray="4 4" />
            <text x={W - PAD.right} y={y(l.value) - 4} textAnchor="end" fontSize={11} fill="var(--sds-text-support)">
              Limite: {l.rule.name} ({fmt(l.value)})
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 8} fontSize={11} fill="var(--sds-text-support)">
          {formatDateTime(numeric[0]!.at)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={11} fill="var(--sds-text-support)">
          {formatDateTime(numeric[numeric.length - 1]!.at)}
        </text>
        <path d={path} fill="none" stroke="var(--sds-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active && (
          <g pointerEvents="none">
            <line x1={x(active.at)} x2={x(active.at)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--sds-text-support)" strokeWidth={1} />
            <circle cx={x(active.at)} cy={y(active.value)} r={4} fill="var(--sds-primary)" stroke="var(--sds-white)" strokeWidth={2} />
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {active && (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: 4,
            left: `${(x(active.at) / W) * 100}%`,
            transform: x(active.at) > W * 0.7 ? 'translateX(-105%)' : 'translateX(8px)',
            background: 'var(--sds-white)',
            border: '1px solid var(--sds-border-strong)',
            borderRadius: 3,
            padding: '4px 8px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--dp04)',
          }}
        >
          <strong>
            {fmt(active.value)} {unit}
          </strong>
          <div className="helper">{formatDateTime(active.at)}</div>
        </div>
      )}
    </figure>
  );
}
