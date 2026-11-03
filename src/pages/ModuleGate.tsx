import { Outlet } from 'react-router-dom';
import { moduleAccess } from '@/access';
import { Button, ErrorState, PageHeader, Panel, useToast } from '@/components/ui';
import type { ModuleId } from '@/domain';
import { MODULES } from '@/modules/registry';
import { useAccess } from '@/app/providers/SessionProvider';
import { usePageLabel } from '@/app/navigation/contextNavigation';
import styles from './Pages.module.css';

/**
 * Protege as rotas de um módulo:
 * - perfil sem permissão → 403;
 * - módulo não contratado → explicação de valor, SEM dados operacionais;
 * - disponível → conteúdo do módulo.
 */
export function ModuleGate({ moduleId }: { moduleId: ModuleId }) {
  const access = useAccess();
  const state = moduleAccess(access, moduleId);
  if (state === 'no-permission') return <NoPermissionView moduleId={moduleId} />;
  if (state === 'not-contracted') return <LockedModuleView moduleId={moduleId} />;
  return <Outlet />;
}

function NoPermissionView({ moduleId }: { moduleId: ModuleId }) {
  const module = MODULES[moduleId];
  usePageLabel(module.name);
  return (
    <>
      <PageHeader title={module.name} breadcrumb={[{ label: module.name }]} />
      <Panel title="Acesso">
        <ErrorState kind={403} text="Seu perfil não tem permissão para acessar este módulo. Fale com o administrador da plataforma." />
      </Panel>
    </>
  );
}

export function LockedModuleView({ moduleId }: { moduleId: ModuleId }) {
  const module = MODULES[moduleId];
  const toast = useToast();
  usePageLabel(module.name);
  return (
    <>
      <PageHeader title={module.name} breadcrumb={[{ label: module.name }]} description={module.summary} />
      <Panel
        title="Capacidade não contratada"
        footerEnd={
          <Button
            icon="comments-o"
            onClick={() =>
              toast.show({
                tone: 'success',
                title: 'Interesse registrado',
                message: `Um consultor entrará em contato sobre ${module.name}. (Simulação)`,
              })
            }
          >
            Falar com um consultor
          </Button>
        }
      >
        <div className={styles.moduleHero}>
          <span className={`${styles.moduleHeroIcon} ${styles.moduleHeroIconLocked}`}>
            <i className="fa fa-lock" aria-hidden="true" />
          </span>
          <div className={styles.moduleHeroText}>
            <p>{module.valueProposition}</p>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>O que este módulo oferece</p>
              <ul className={styles.checkList}>
                {module.responsibilities.map((r) => (
                  <li key={r}>
                    <i className="fa fa-check" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="helper">
              Este módulo não faz parte do contrato atual. Nenhum dado operacional dele é exibido enquanto não estiver contratado.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
