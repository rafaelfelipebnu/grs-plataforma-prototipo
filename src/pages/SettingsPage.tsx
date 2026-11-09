import { CAPABILITY_LABEL, COMMERCIAL_PLANS, hasActionPlanCapability } from '@/access';
import { Alert, Badge, Col, Grid, LabelValue, LabelValueGrid, PageHeader, Panel, Stack } from '@/components/ui';
import type { Permission } from '@/domain';
import { useAccess } from '@/app/providers/SessionProvider';
import { useServices } from '@/app/providers/ServicesProvider';
import { usePageLabel } from '@/app/navigation/contextNavigation';

const PERMISSION_LABEL: Record<Permission, string> = {
  'hub.view': 'Security Hub — consultar',
  'hub.events.acknowledge': 'Security Hub — reconhecer alertas',
  'hub.dashboard.default': 'Security Hub — definir o painel padrão do cliente',
  'central.view': 'Central de Ativos — consultar',
  'central.manage': 'Central de Ativos — gerenciar cadastro',
  'central.groups.corporate': 'Central de Ativos — administrar grupos corporativos e regras gerais',
  'monitor.view': 'Monitor de Infraestrutura — consultar',
  'monitor.manage': 'Monitor de Infraestrutura — configurar monitoramento',
  'rotinas.view': 'Gestão de Rotinas — consultar',
  'rotinas.manage': 'Gestão de Rotinas — gerenciar planos e rotinas',
  'rotinas.execute': 'Gestão de Rotinas — executar rotinas',
  'manutencao.view': 'Gestão de Manutenção — consultar',
  'manutencao.request': 'Gestão de Manutenção — abrir solicitações',
  'manutencao.manage': 'Gestão de Manutenção — triagem e planejamento',
  'manutencao.execute': 'Gestão de Manutenção — executar ordens de serviço',
  'ocorrencias.view': 'Gestão de Ocorrências — consultar',
  'ocorrencias.register': 'Gestão de Ocorrências — registrar',
  'ocorrencias.treat': 'Gestão de Ocorrências — tratar (trâmite, pausa, prioridade)',
  'ocorrencias.conclude': 'Gestão de Ocorrências — concluir e aprovar conclusão',
  'ocorrencias.exception': 'Gestão de Ocorrências — autorizar exceção de conclusão',
  'ocorrencias.link': 'Gestão de Ocorrências — confirmar sugestão de vínculo',
  'ocorrencias.configure': 'Gestão de Ocorrências — configurar tipos',
  'planos.view': 'Planos de ação — consultar (escopo do local do plano)',
  'planos.manage': 'Planos de ação — criar, ser responsável e vincular',
  'planos.approve': 'Planos de ação — aprovar plano e avaliação de eficácia',
  'planos.evaluate': 'Planos de ação — avaliar eficácia',
  'planos.execute': 'Planos de ação — executar ações atribuídas',
  'riscos.view': 'Gestão de Riscos — consultar',
  'riscos.manage': 'Gestão de Riscos — avaliar',
  'pessoas.view': 'Pessoas (fonte integrada) — consultar',
  'admin.contract': 'Administração — contrato e configurações corporativas',
};

/** Perfil e configurações do usuário — somente leitura nesta etapa. */
export function SettingsPage() {
  const access = useAccess();
  const services = useServices();
  usePageLabel('Perfil e configurações');
  const tree = services.locations.getTree(access);
  const plan = COMMERCIAL_PLANS[access.contract.planId];

  return (
    <>
      <PageHeader title="Perfil e configurações" breadcrumb={[{ label: 'Perfil e configurações' }]} />
      <Stack>
        <Alert tone="info">
          Perfis, escopos e contrato são definidos pela administração da plataforma. Nesta demonstração, troque de perfil pelo menu do
          usuário e de perfil comercial pelos controles da demonstração.
        </Alert>
        <Grid>
          <Col span={6}>
            <Panel title="Usuário">
              <LabelValueGrid>
                <LabelValue label="Nome">{access.person?.name}</LabelValue>
                <LabelValue label="Cargo ou função">{access.person?.jobTitle}</LabelValue>
                <LabelValue label="Login">{access.user.login}</LabelValue>
                <LabelValue label="Perfil de acesso">{access.profile.name}</LabelValue>
              </LabelValueGrid>
              <p className="muted" style={{ marginTop: 16 }}>
                {access.profile.description}
              </p>
            </Panel>
          </Col>
          <Col span={6}>
            <Panel title="Escopo de localização">
              {access.visibleLocationIds === 'all' ? (
                <p>Escopo corporativo: todas as unidades da empresa.</p>
              ) : (
                <>
                  <p style={{ marginBottom: 8 }}>Você enxerga dados destas localizações e de todos os locais abaixo delas:</p>
                  <ul>
                    {tree.map((n) => (
                      <li key={n.location.id}>{n.location.name}</li>
                    ))}
                  </ul>
                </>
              )}
              <p className="helper" style={{ marginTop: 12 }}>
                O escopo se aplica a listas, detalhes, indicadores, buscas, notificações e ações.
              </p>
            </Panel>
          </Col>
          <Col span={6}>
            <Panel title="Permissões do perfil">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {access.profile.permissions.map((p) => (
                  <li key={p}>{PERMISSION_LABEL[p]}</li>
                ))}
              </ul>
              <p className="helper" style={{ marginTop: 12 }}>
                Distribuição de permissões provisória, pendente de validação com clientes.
              </p>
            </Panel>
          </Col>
          <Col span={6}>
            <Panel title="Contrato do cliente">
              <LabelValueGrid>
                <LabelValue label="Perfil comercial">
                  {plan.name} {!plan.compositionConfirmed && <Badge tone="yellow">Composição provisória</Badge>}
                </LabelValue>
                <LabelValue label="Planos de ação">{hasActionPlanCapability(access.contract) ? 'Habilitados' : 'Não habilitados'}</LabelValue>
              </LabelValueGrid>
              <p className="helper" style={{ margin: '16px 0 8px' }}>
                Capacidades contratadas
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {access.contract.capabilities.map((c) => (
                  <Badge key={c} tone="green" icon="check">
                    {CAPABILITY_LABEL[c]}
                  </Badge>
                ))}
              </div>
            </Panel>
          </Col>
        </Grid>
      </Stack>
    </>
  );
}
