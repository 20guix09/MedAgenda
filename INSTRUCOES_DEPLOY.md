# Publicação: Railway + Vercel

## 1. Backend no Railway

Crie ou abra o serviço da API e defina **Root Directory** como `backend`.
O comando de início é `npm start` e o healthcheck é `/health` (o arquivo
`backend/railway.toml` já registra essas opções).

Em **Variables**, configure:

```env
NODE_ENV=production
JWT_SECRET=uma-chave-aleatoria-com-32-ou-mais-caracteres
CORS_ORIGINS=https://medagenda-rust.vercel.app
DATABASE_PATH=/data/banco.db
APP_TIME_ZONE=America/Sao_Paulo
COOKIE_SAME_SITE=none
GOOGLE_CLIENT_ID=seu-client-id-do-google
```

Troque `https://medagenda-rust.vercel.app` pela URL de produção real do seu
projeto Vercel, se ela for diferente. Se existir mais de uma origem que deve
acessar a API, separe-as por vírgula, sem barra no final.

Anexe um **Volume** ao serviço, com ponto de montagem `/data`; sem ele, o banco
SQLite pode ser perdido em um novo deploy. Gere um domínio público para o
serviço e confirme que `https://SEU-DOMINIO-RAILWAY/health` responde
`{"status":"ok"}`.

## 2. Frontend na Vercel

Crie/edite o projeto apontando para o mesmo repositório. Configure:

| Campo | Valor |
| --- | --- |
| Root Directory | `clinica-medica` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Em **Settings > Environment Variables**, adicione para **Production**:

```env
VITE_API_URL=https://SEU-DOMINIO-RAILWAY
VITE_USE_MOCKS=false
VITE_GOOGLE_CLIENT_ID=seu-client-id-do-google
```

Não coloque barra `/` ao final de `VITE_API_URL`. Depois de alterar uma variável
na Vercel, faça um novo deploy: as variáveis são inseridas durante o build.

## 3. Google Login

No Google Cloud Console, o mesmo Client ID deve ter a URL final da Vercel em
**Authorized JavaScript origins**. Use apenas a origem, por exemplo
`https://medagenda-rust.vercel.app`, sem `/login` no fim.

## 4. Teste local

Em dois terminais separados:

```bash
cd backend
npm ci
npm run dev
```

```bash
cd clinica-medica
npm ci
npm run dev
```

## Não apague os projetos

Não é necessário apagar Vercel ou Railway. Atualize o código, as variáveis
acima e faça deploy novamente. Antes de recriar qualquer serviço, faça backup
do arquivo `banco.db` do Volume, porque ele contém os usuários e os dados do
sistema.
