# Frontend MedAgenda

Estrutura organizada por responsabilidade:

- `pages/`: páginas ligadas às rotas.
- `components/dashboard/`: widgets do Dashboard e calendário.
- `components/resources/`: CRUD reutilizável de pacientes, médicos, consultas e especialidades.
- `components/system/`: modais e recursos gerais do sistema.
- `components/OnboardingTutorial.jsx`: tutorial do primeiro acesso.
- `components/MobileRotateNotice.jsx`: aviso opcional de orientação no celular.
- `config/`: textos e configurações estáticas da interface.
- `contexts/`: estado global de autenticação.
- `services/`: comunicação com a API.
- `styles/`: estilos globais e por funcionalidade.
- `routes/`: definição e proteção das rotas.

Os comentários no código são curtos e explicam a responsabilidade principal sem repetir a implementação.
