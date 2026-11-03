import { can } from '@/access';
import type { Location, Person, SourceSystem } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { ContextLink } from '@/app/navigation/contextNavigation';
import { paths } from '@/app/navigation/targets';

export const SOURCE_LABEL: Record<SourceSystem, string> = {
  'security-hub': MODULES['security-hub'].name,
  central: MODULES.central.name,
  monitor: MODULES.monitor.name,
  rotinas: MODULES.rotinas.name,
  manutencao: MODULES.manutencao.name,
  ocorrencias: MODULES.ocorrencias.name,
  riscos: MODULES.riscos.name,
  'controle-acesso': 'Controle de Acesso (integração simulada)',
};

/** Pessoa com link apenas se o perfil puder consultar pessoas. */
export function PersonRef({ person }: { person: Person | undefined }) {
  const access = useAccess();
  if (!person) return <span className="muted">Não definido</span>;
  return can(access, 'pessoas.view') ? (
    <ContextLink to={paths.person(person.id)}>{person.name}</ContextLink>
  ) : (
    <span>{person.name}</span>
  );
}

/** Caminho de localização com o último nível clicável. */
export function LocationLink({ path }: { path: Location[] }) {
  const last = path[path.length - 1];
  if (!last) return <span className="muted">Não informada</span>;
  const parents = path.slice(0, -1).map((l) => l.name).join(' › ');
  return (
    <span>
      {parents && <span className="muted">{parents} › </span>}
      <ContextLink to={paths.location(last.id)}>{last.name}</ContextLink>
    </span>
  );
}
