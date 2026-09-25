# MedAgenda — sistema de clínica médica

Frontend React 19/Vite e API Node.js/Express com SQLite (better-sqlite3). Cada conta possui seus próprios pacientes, profissionais, especialidades e consultas.

## Requisitos e inicialização

Node.js 22.13 ou superior. Execute `npm ci` separadamente em `backend/` e `clinica-medica/`. Copie cada `.env.example` para um arquivo `.env` na mesma pasta e preencha as variáveis antes do desenvolvimento. Os arquivos `.env.example` são modelos sem segredos. O `.gitignore` impede que arquivos `.env` e bancos locais sejam adicionados ao Git. Inicie a API com `npm run dev` em `backend/` e o frontend com `npm run dev` em `clinica-medica/`. Acesse `http://localhost:5173`.

A API cria o banco ao iniciar; `DATABASE_PATH` seleciona o arquivo. Use um caminho persistente em hospedagem e faça backups. O backup legado recebido com o projeto não é necessário para executar o sistema e não foi incluído na entrega. Nunca use um banco real nos testes. O schema e as adições de colunas/índices são aplicados em `backend/database.js`, sem apagar tabelas existentes. Antes de atualizar um banco real, faça cópia do arquivo.

## Configuração

`FRONTEND_URL` aceita a origem exata do frontend, com origens adicionais separadas por vírgula. `VITE_API_URL` aponta à API, sem barra final. `VITE_USE_MOCKS=true` habilita mocks somente no modo de desenvolvimento; build de produção usa a API. `APP_TIME_ZONE` determina o horário local da agenda. Para login Google, configure o mesmo Client ID no backend (`GOOGLE_CLIENT_ID`) e no frontend (`VITE_GOOGLE_CLIENT_ID`). Contas locais preexistentes não são vinculadas automaticamente ao Google.

A sessão usa cookie HttpOnly com duração de uma hora. Em produção, HTTPS é necessário. Para frontend e API em sites distintos, configure `COOKIE_SAME_SITE=none` com HTTPS, origem autorizada em `FRONTEND_URL` e cookies de terceiros permitidos pelo navegador. Credenciais e segredos não devem usar variáveis `VITE_*`.

## Qualidade

Em `backend/`, rode `npm test`. Em `clinica-medica/`, rode `npm run lint` e `npm run build`. Testes usam banco temporário próprio. A API limita relações entre contas com filtros por `usuario_id` e gatilhos; o histórico de exclusões é criado pelo servidor. O frontend tem rotas de cadastro, login, painel e cadastros. As rotas privadas exigem sessão válida.

Este projeto é didático. Antes de uso clínico com dados reais, verifique necessidades de privacidade, retenção, backups e controle operacional apropriados ao contexto.

## Publicação na Vercel

O React Router usa URLs como `/dashboard` e `/pacientes`. Os arquivos `vercel.json` na raiz e em `clinica-medica/` configuram o fallback para `index.html` ao abrir ou atualizar essas URLs. A Vercel considera o arquivo da pasta configurada como **Root Directory** do projeto; configure a pasta `clinica-medica` como raiz para um deploy direto do frontend (Framework Preset: Vite; Output Directory: `dist`). Se seu projeto Vercel usa a raiz do repositório e um comando de build próprio, o arquivo de configuração na raiz cobre essa opção. Publique uma nova versão após adicionar o arquivo.

Na Vercel, configure `VITE_API_URL` com a URL pública da API antes de construir o frontend. Um `.env` local com `localhost:3000` é somente para desenvolvimento; ele não permite que outros computadores acessem a API. Configure `CORS_ORIGINS` no backend com a origem pública do frontend.

Leia também [INSTRUCOES_DEPLOY.md](INSTRUCOES_DEPLOY.md) antes de publicar no Railway e na Vercel. Não envie arquivos `.env` ou arquivos `*.db` ao Git.
