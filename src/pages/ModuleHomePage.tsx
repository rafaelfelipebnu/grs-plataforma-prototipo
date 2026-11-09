import { Alert, Icon, PageHeader, Panel, Stack } from '@/components/ui';
import { LocationPath } from '@/components/domain';
import type { ModuleId } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess, useSession } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import styles from './Pages.module.css';

/**
 * Página inicial provisória de um módulo cujas telas ainda não fazem parte da
 * demonstração. Mostra o papel do módulo e o contexto ativo — sem simular
 * telas ou dados que ainda não existem.
 */
export function ModuleHomePage({ moduleId }: { moduleId: ModuleId }) {
  const module = MODULES[moduleId];
  const access = useAccess();
  const services = useServices();
  const { activeLocationId } = useSession();
  usePageLabel(module.name);
  const contextPath = activeLocationId ? services.locations.pathOf(access, activeLocationId) : [];

  return (
    <>
      <PageHeader title={module.name} breadcrumb={[{ label: module.name }]} description={module.summary} />
      <Stack>
        <Alert tone="info" title="Em preparação para a demonstração">
          A navegação, as permissões, o contrato e o contexto de localização deste módulo já estão ativos. As telas de {module.name} ainda não
          estão disponíveis nesta demonstração.
        </Alert>
        <Panel title="Responsabilidades do módulo">
          <div className={styles.moduleHero}>
            <span className={styles.moduleHeroIcon}>
              <Icon name={module.icon} />
            </span>
            <div className={styles.moduleHeroText}>
              <ul className={styles.checkList}>
                {module.responsibilities.map((r) => (
                  <li key={r}>
                    <i className="fa fa-check" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="helper">
                Contexto de localização ativo:{' '}
                {contextPath.length > 0 ? <LocationPath path={contextPath} icon={false} /> : 'todas as localizações do seu escopo'}.
              </p>
            </div>
          </div>
        </Panel>
      </Stack>
    </>
  );
}
