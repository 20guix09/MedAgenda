// página principal desta área do sistema

import {
  Activity,
  CalendarClock,
  CalendarDays,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  Stethoscope,
  UsersRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import MobileRotateNotice from '../components/MobileRotateNotice.jsx';
import OnboardingTutorial from '../components/OnboardingTutorial.jsx';
import { MetricCard, MiniCalendar, StatusBadge } from '../components/dashboard/DashboardWidgets.jsx';
import ResourcePage, { ResourceModal } from '../components/resources/ResourcePage.jsx';
import SystemModal from '../components/system/SystemModal.jsx';
import { consultasService } from '../services/consultasService.js';
import { dashboardService } from '../services/dashboardService.js';
import { especialidadesService } from '../services/especialidadesService.js';
import { apiRequest, shouldUseMocks } from '../services/api.js';
import { mockCrudService } from '../mocks/mockCrudService.js';
import { pacientesService } from '../services/pacientesService.js';
import '../styles/dashboard.css';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Pacientes', path: '/pacientes', icon: UsersRound },
  { label: 'Médicos', path: '/medicos', icon: Stethoscope },
  { label: 'Consultas', path: '/consultas', icon: CalendarClock },
  { label: 'Especialidades', path: '/especialidades', icon: Activity },
];

// O backend atual expõe médicos em /medico (singular).
// Mantemos esta adaptação aqui para não depender de um endpoint incorreto
// no serviço antigo.
const medicosService = {
  list() {
    return shouldUseMocks()
      ? mockCrudService.list('medicos')
      : apiRequest('/medico');
  },

  getById(id) {
    return shouldUseMocks()
      ? mockCrudService.getById('medicos', id)
      : apiRequest(`/medico/${id}`);
  },

  create(payload) {
    return shouldUseMocks()
      ? mockCrudService.create('medicos', payload)
      : apiRequest('/medico', {
          method: 'POST',
          body: payload,
        });
  },

  update(id, payload) {
    return shouldUseMocks()
      ? mockCrudService.update('medicos', id, payload)
      : apiRequest(`/medico/${id}`, {
          method: 'PUT',
          body: payload,
        });
  },

  remove(id) {
    return shouldUseMocks()
      ? mockCrudService.remove('medicos', id)
      : apiRequest(`/medico/${id}`, {
          method: 'DELETE',
        });
  },
};

// obtém time greeting
function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// obtém user greeting
function getUserGreeting(user, firstName) {
  const userKey = user?.id ?? user?.email ?? firstName.toLowerCase();
  const storageKey = `medagenda:welcome-seen:${userKey}`;

  if (window.localStorage.getItem(storageKey) !== 'true') {
    window.localStorage.setItem(storageKey, 'true');
    return `Seja bem-vindo, ${firstName}`;
  }

  return `${getTimeGreeting()}, ${firstName}`;
}

// obtém display name
function getDisplayName(user) {
  const name = user?.nome?.trim();

  if (name && !name.toLowerCase().startsWith('profissional')) {
    return name;
  }

  const emailName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();

  if (emailName) {
    return emailName
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return 'Guilherme';
}

const pages = {
  '/pacientes': {
    resource: 'pacientes',
    title: 'Pacientes',
    subtitle: 'Cadastros, contatos e histórico da base atendida',
    action: 'Novo paciente',
    search: 'Pesquisar por nome, CPF, telefone, e-mail, CEP ou endereço',
    searchKeys: ['nome', 'cpf', 'telefone', 'email', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
    service: pacientesService,
    columns: [
      ['nome', 'Paciente'],
      ['cpf', 'CPF'],
      ['telefone', 'Telefone'],
      ['email', 'E-mail'],
    ],
    fields: [
      ['nome', 'Nome'],
      ['cpf', 'CPF'],
      ['telefone', 'Telefone'],
      ['email', 'E-mail'],
      ['data_nascimento', 'Nascimento', 'date'],
      ['sexo', 'Sexo'],
      ['cep', 'CEP'],
      ['rua', 'Rua'],
      ['numero', 'Número'],
      ['complemento', 'Complemento'],
      ['bairro', 'Bairro'],
      ['cidade', 'Cidade'],
      ['estado', 'Estado'],
    ],
  },

  '/medicos': {
    resource: 'medicos',
    title: 'Médicos',
    subtitle: 'Profissionais, especialidades e disponibilidade da clínica',
    action: 'Novo médico',
    search: 'Pesquisar por nome, CPF, CRM, e-mail ou especialidade',
    searchKeys: ['nome', 'cpf', 'crm', 'estado_crm', 'telefone', 'email', 'especialidade', 'especialidades_nomes', 'status'],
    service: medicosService,
    columns: [
      ['nome', 'Profissional'],
      ['crm', 'CRM'],
      ['especialidades_nomes', 'Especialidades'],
      ['telefone', 'Telefone'],
      ['status', 'Status'],
    ],
    fields: [
      ['nome', 'Nome'],
      ['cpf', 'CPF'],
      ['crm', 'CRM'],
      ['estado_crm', 'Estado do CRM'],
      ['especialidade_ids', 'Especialidades', 'specialties'],
      ['telefone', 'Telefone'],
      ['email', 'E-mail'],
      ['status', 'Status', 'select', ['ativo', 'inativo']],
    ],
  },

  '/consultas': {
    resource: 'consultas',
    title: 'Consultas',
    subtitle: 'Atendimentos agendados e status operacional',
    action: 'Nova consulta',
    search: 'Pesquisar por paciente, médico, especialidade, data ou status',
    searchKeys: ['paciente', 'medico', 'especialidade', 'data', 'horario', 'tipo', 'status', 'observacao'],
    service: consultasService,
    columns: [
      ['data', 'Data'],
      ['horario', 'Horário'],
      ['paciente', 'Paciente'],
      ['medico', 'Médico'],
      ['especialidade', 'Especialidade'],
      ['status', 'Status'],
    ],
    fields: [
      ['data', 'Data', 'date'],
      ['horario', 'Horário', 'time'],
      ['paciente_id', 'Paciente', 'patient'],
      ['medico_id', 'Médico', 'doctor'],
      ['especialidade_id', 'Especialidade', 'specialty'],
      ['tipo', 'Tipo'],
      ['status', 'Status', 'select', ['pendente', 'confirmada', 'finalizada']],
      ['observacao', 'Observação'],
    ],
  },

  '/especialidades': {
    resource: 'especialidades',
    title: 'Especialidades',
    subtitle: 'Áreas de atendimento oferecidas pela clínica',
    action: 'Nova especialidade',
    search: 'Pesquisar por nome, descrição ou status',
    searchKeys: ['nome', 'descricao', 'status'],
    placeholders: {
      nome: 'Ex.: Cardiologista',
      descricao: 'Ex.: Atendimento especializado em prevenção, diagnóstico e acompanhamento de doenças do coração.',
    },
    service: especialidadesService,
    columns: [
      ['nome', 'Especialidade'],
      ['descricao', 'Descrição'],
      ['status', 'Status'],
    ],
    fields: [
      ['nome', 'Nome'],
      ['descricao', 'Descrição'],
      ['status', 'Status', 'select', ['ativo', 'inativo']],
    ],
  },
};

// componente dashboard page
export default function DashboardPage() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [consultasHoje, setConsultasHoje] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardModal, setDashboardModal] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [systemModal, setSystemModal] = useState(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => window.sessionStorage.getItem('medagenda:novoUsuario') === 'true');
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [topbarGreeting, setTopbarGreeting] = useState('');
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const currentPage = pages[location.pathname];

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      const [summaryData, consultasData, calendarioData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getConsultasHoje(),
        dashboardService.getCalendario(),
      ]);

      setSummary(summaryData);
     setConsultasHoje(consultasData);
      setCalendario(calendarioData);
    } catch (error) {
     console.error('Erro ao carregar dashboard:', error);
   } finally {
     setIsLoading(false);
   }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsOptionsOpen(false);
  }, [location.pathname]);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const firstName = useMemo(() => displayName.split(' ')[0] ?? 'Guilherme', [displayName]);

  useEffect(() => {
    setTopbarGreeting(getUserGreeting(user, firstName));
  }, [firstName, user?.email, user?.id]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => setToastMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await apiRequest('/historico');
        setDeletedHistory(data);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      }
    }

    loadHistory();
  }, [user?.id]);

// função para handle record deleted
  async function handleRecordDeleted() {
    try {
      const data = await apiRequest('/historico');
      setDeletedHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

// função para handle record restore
  async function handleRecordRestore(entry) {
    const config = Object.values(pages).find((page) => page.resource === entry.resource);

    if (!config) return;

    await config.service.restore(entry.record);
    await apiRequest(`/historico/${entry.id}/restaurado`, { method: 'PATCH' });
    setDeletedHistory((current) =>
      current.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              restored: true,
              restoredAt: new Date().toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
            }
          : item,
      ),
    );
    setToastMessage(`${entry.resourceLabel} restaurado com sucesso.`);
    setResourceRefreshKey((current) => current + 1);
    await loadDashboard();
  }

  // Fecha o onboarding e marca esta sessão como concluída.
  function closeTutorial() {
    window.sessionStorage.removeItem('medagenda:novoUsuario');
    setIsTutorialOpen(false);
  }

  return (
    <main className="app-frame">
      <button
        className={`mobile-sidebar-backdrop ${isMobileMenuOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Fechar menu"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`app-sidebar ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <div className="app-brand" aria-label="MedAgenda">
          <div className="app-brand-mark">
            <img src="/logo-medAgenda.png" alt="" />
          </div>
          <strong>
            <span>Med</span>Agenda
          </strong>
        </div>

        <nav className="app-nav" aria-label="Navegação principal">
          <small>Gestão</small>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink className="app-nav-item" key={item.path} to={item.path}>
                <Icon size={18} strokeWidth={1.65} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar-tools">
          <button className="app-options-trigger" type="button" onClick={() => setIsOptionsOpen((current) => !current)}>
            <MoreHorizontal size={19} strokeWidth={1.7} />
            <span>Opções</span>
          </button>

          {isOptionsOpen ? (
            <div className="app-options-menu">
              <button
                type="button"
                onClick={() => {
                  setSystemModal('info');
                  setIsOptionsOpen(false);
                }}
              >
                <Info size={18} strokeWidth={1.8} />
                <span>Informações</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSystemModal('history');
                  setIsOptionsOpen(false);
                }}
              >
                <History size={17} strokeWidth={1.7} />
                <span>Histórico</span>
              </button>
            </div>
          ) : null}
        </div>

        <button className="app-logout" type="button" onClick={logout}>
          <LogOut size={18} strokeWidth={1.65} />
          <span>Sair</span>
        </button>
      </aside>

      <section className="app-workspace">
        <header className="app-topbar">
          <button
            className="mobile-menu-trigger"
            type="button"
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? <X size={21} strokeWidth={1.8} /> : <Menu size={21} strokeWidth={1.8} />}
          </button>

          <div>
            <strong>{topbarGreeting || `${getTimeGreeting()}, ${firstName}`}</strong>
            <span>{currentPage?.title ?? 'Visão geral'}</span>
          </div>

          <label className="app-search">
            <Search size={18} strokeWidth={1.6} />
            <input type="search" placeholder="Pesquisar no sistema..." />
          </label>

          <div className="app-profile">
            <span>{firstName.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{user?.perfil ?? 'Administrador'}</small>
            </div>
          </div>
        </header>

        <div className="dashboard-surface">
          {currentPage ? (
            <ResourcePage
              config={currentPage}
              onDataChange={loadDashboard}
              onRecordDeleted={handleRecordDeleted}
              refreshKey={resourceRefreshKey}
            />
          ) : (
            <>
              <section className="dashboard-hero">
                <div>
                  <p>Bom retorno, {firstName}</p>
                  <h1>Agenda clínica sob controle.</h1>
                  <span>Uma leitura rápida do movimento de hoje, com foco no que precisa de atenção primeiro.</span>
                </div>
                <button className="dashboard-primary-action interactive-press" type="button" onClick={() => setDashboardModal({ mode: 'create' })}>
                  <CalendarDays size={18} strokeWidth={1.7} />
                  <span>Nova consulta</span>
                </button>
              </section>

              <section className="metric-grid" aria-label="Resumo do dashboard">
                <MetricCard icon={CalendarClock} label="Consultas de hoje" value={summary?.consultasHoje} detail="Atendimentos previstos" />
                <MetricCard icon={UsersRound} label="Pacientes cadastrados" value={summary?.pacientesCadastrados} detail="Base ativa da clínica" />
                <MetricCard icon={Stethoscope} label="Médicos ativos" value={summary?.medicosAtivos} detail="Profissionais atendendo" />
                <MetricCard icon={Activity} label="Consultas pendentes" value={summary?.consultasPendentes} detail="Aguardando confirmação" />
              </section>

              <section className="dashboard-grid">
                <article className="dashboard-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Consultas de hoje</h2>
                      <p>Dados vindos da rota de dashboard</p>
                    </div>
                    <span>{isLoading ? 'Carregando' : `${consultasHoje.length} registros`}</span>
                  </div>

                  <div className="appointments-list">
                    {consultasHoje.map((consulta) => (
                      <div className="appointment-row" key={consulta.id}>
                        <strong>{consulta.horario}</strong>
                        <div>
                          <span>{consulta.paciente}</span>
                          <small>{consulta.medico} - {consulta.especialidade}</small>
                        </div>
                        <StatusBadge status={consulta.status} />
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-panel dashboard-calendar">
                  <div className="panel-heading">
                    <div>
                      <h2>Agenda do mês</h2>
                      <p>Dias com consultas marcadas</p>
                    </div>
                  </div>
                  <MiniCalendar calendario={calendario} />
                </article>
              </section>
            </>
          )}
        </div>
      </section>

      {dashboardModal ? (
        <ResourceModal
          config={pages['/consultas']}
          mode={dashboardModal.mode}
          onClose={() => setDashboardModal(null)}
          onSave={async (values) => {
            await consultasService.create({
              status: 'Pendente',
              ...values,
            });
            setDashboardModal(null);
            await loadDashboard();
          }}
        />
      ) : null}

      {systemModal ? (
        <SystemModal
          deletedHistory={deletedHistory}
          mode={systemModal}
          onClose={() => setSystemModal(null)}
          onRestore={handleRecordRestore}
          onOpenTutorial={() => {
            setSystemModal(null);
            setIsTutorialOpen(true);
          }}
        />
      ) : null}

      <OnboardingTutorial open={isTutorialOpen} onClose={closeTutorial} />
      <MobileRotateNotice />

      {toastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
