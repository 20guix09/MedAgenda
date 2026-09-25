// inicia e configura o servidor da API

require('dotenv').config()

const express = require('express')
const cors = require('cors')

const db = require('./database')

const app = express()
const PORT = process.env.PORT || 3000
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('troque-por')) throw new Error('Configure JWT_SECRET com chave aleatória de ao menos 32 caracteres')
// CORS_ORIGINS é a configuração preferida. FRONTEND_URL continua funcionando
// para instalações antigas. Aceita mais de uma origem separada por vírgula.
const configuredOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173'
const origins = configuredOrigins
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)
if (process.env.NODE_ENV === 'production' && origins.length === 0) throw new Error('Configure CORS_ORIGINS ou FRONTEND_URL em produção')

// Railway fica atrás de proxy HTTPS. Isto preserva o comportamento correto
// de cookies seguros e do IP do cliente em produção.
app.set('trust proxy', 1)
app.use(cors({
  origin: function (origin, callback) {

    if (!origin) return callback(null, true)

    if (origins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true)
    }

    console.log("CORS bloqueado:", origin)
    const corsError = new Error("Não permitido pelo CORS")
    corsError.status = 403
    callback(corsError)
  },
  credentials: true
}))
app.use((req,res,next) => {
  const requestOrigin = req.headers.origin?.replace(/\/$/, '')
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && requestOrigin && !origins.includes(requestOrigin))
    return res.status(403).json({ erro:'Origem não autorizada' })
  next()
})
app.use(express.json({ limit: '100kb' }))
app.disable('x-powered-by')
app.use((req,res,next) => {
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('X-Frame-Options','DENY')
  next()
})

// Middleware de log
app.use((req, res, next) => {
  const horario = new Date().toLocaleTimeString('pt-BR')

  console.log(`[${horario}] ${req.method} ${req.path}`)

  req.horario = horario

  next()
})

// Importar rotas
const authRouter = require('./routes/auth')
const pacientesRoutes = require('./routes/pacientes')
const consultasRoutes = require('./routes/consultas')
const especialidadeRoutes = require('./routes/especialidade')
const medicoRoutes = require('./routes/medico')
const dashboardRoutes = require('./routes/dashboard')
const historicoRoutes = require('./routes/historico')

const autenticarToken = require('./middlewares/autenticarToken')

// ==========================================
// rotas públicas
// ==========================================

app.use('/auth', authRouter)

// O instantâneo de exclusão vem sempre do banco e da conta autenticada.
app.use((req,res,next) => {
  if (req.method !== 'DELETE') return next()
  const match = /^\/(pacientes|medico|especialidade|consultas)\/(\d+)$/.exec(req.path)
  if (!match) return next()
  const table = { pacientes:'pacientes', medico:'medicos', especialidade:'especialidades', consultas:'consultas' }[match[1]]
  if (!req.usuario) return autenticarToken(req,res,() => capture())
  return capture()
  function capture() {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id=? AND usuario_id=?`).get(Number(match[2]),req.usuario.id)
  if (!row) return next()
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return
    try {
      const resource = { medico:'medicos', especialidade:'especialidades' }[match[1]] || match[1]
      db.prepare(`INSERT INTO historico(usuario_id,resource,resource_label,record_json,data) VALUES(?,?,?,?,?)`)
        .run(req.usuario.id,resource,resource,JSON.stringify(row),new Date().toISOString())
    } catch(err) { console.error('Falha ao registrar exclusão:',err.message) }
  })
  next()
  }
})

// ==========================================
// rotas protegidas
// ==========================================

app.use('/pacientes', autenticarToken, pacientesRoutes)

app.use('/consultas', autenticarToken, consultasRoutes)

app.use('/especialidade', autenticarToken, especialidadeRoutes)

app.use('/medico', autenticarToken, medicoRoutes)

app.use('/dashboard', autenticarToken, dashboardRoutes)

app.use('/historico', autenticarToken, historicoRoutes)

// ==========================================
// rotas iniciais
// ==========================================

app.get('/', (req, res) => {
  res.send('Finalmente, o projeto da clínica médica está funcionando!')
})

app.get('/oi', (req, res) => {
  res.json({
    status: 'online',
    horario: req.horario
  })
})

// Endpoint simples para o healthcheck do Railway.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// ==========================================
// middleware global de erros
// ==========================================

app.use((req,res) => res.status(404).json({erro:'Rota não encontrada'}))
app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}`)

  const status = err.status && err.status < 500 ? err.status : 500
  const mensagem = status === 500 ? 'Erro interno do servidor' : err.message

  res.status(status).json({
    erro: mensagem
  })
})

// ==========================================
// servidor
// ==========================================

if (require.main === module) app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`))
module.exports = app
