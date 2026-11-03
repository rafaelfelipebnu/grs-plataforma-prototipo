import type { Location } from '@/domain';
import { Icon } from '@/components/ui';

interface LocationPathProps {
  path: Location[];
  /** Mostra só os N últimos níveis. */
  tail?: number;
  icon?: boolean;
}

/** Caminho hierárquico de localização (Unidade › Prédio › Setor › Sala). */
export function LocationPath({ path, tail, icon = true }: LocationPathProps) {
  if (path.length === 0) return <span className="muted">Localização não informada</span>;
  const shown = tail ? path.slice(-tail) : path;
  const full = path.map((l) => l.name).join(' › ');
  return (
    <span title={full}>
      {icon && <Icon name="map-marker" className="muted" />} {tail && path.length > tail ? '… › ' : ''}
      {shown.map((l) => l.name).join(' › ')}
    </span>
  );
}
