// Rotas de autenticação e acesso com Google.
const express = require('express')
const router = express.Router()

const db = require('../database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const attempts = new Map()
router.use((req,res,next) => {
  if (req.method !== 'POST' || !['/login','/cadastro','/google'].includes(req.path)) return next()
  const key = req.ip + ':' + req.path, now = Date.now()
  if (attempts.size > 10000) for (const [k,v] of attempts) if (v.until < now) attempts.delete(k)
  const entry = attempts.get(key)
  if (entry && entry.until > now && entry.count >= 20) return res.status(429).json({erro:'Muitas tentativas. Aguarde alguns minutos.'})
  attempts.set(key, { count: entry && entry.until > now ? entry.count + 1 : 1, until: now + 15*60*1000 })
  next()
})
const cookieSameSite = (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase()
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) throw new Error('COOKIE_SAME_SITE deve ser lax, strict ou none')
const cookieOptions = {
  httpOnly: true,
  // Cookies SameSite=None só funcionam com HTTPS. Em desenvolvimento local,
  // o cookie continua utilizável sem forçar HTTPS.
  secure: process.env.NODE_ENV === 'production' || cookieSameSite === 'none',
  sameSite: cookieSameSite,
  path: '/',
  maxAge: 3600000,
}
function setSession(res, token) { res.cookie('medagenda_session', token, cookieOptions) }
function tokenFromRequest(req) {
  const authorization = req.get('authorization') || ''
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim()
  const cookie = (req.headers.cookie || '').split('; ').find(v => v.startsWith('medagenda_session='))
  return cookie?.slice('medagenda_session='.length) || null
}
function currentUser(req) {
  const token = tokenFromRequest(req)
  if (!token) return null
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

router.get('/me', (req,res) => {
  const session = currentUser(req)
  if (!session) return res.status(401).json({ erro:'Sessão inválida ou expirada' })
  const user = db.prepare('SELECT id,nome,email FROM usuarios WHERE id=?').get(session.id)
  if (!user) return res.status(401).json({ erro:'Sessão inválida' })
  res.json({ usuario:user })
})
router.post('/logout', (req,res) => { res.clearCookie('medagenda_session', cookieOptions); res.status(204).send() })

const {
  validarObrigatorios,
  emailValido
} = require('../helpers/validacao')

// cadastrar usuário
router.post('/cadastro', async (req, res, next) => {
  try {
    const {
      nome,
      email,
      senha
    } = req.body

    const erros = validarObrigatorios(
      req.body,
      ['nome', 'email', 'senha']
    )

    if (typeof nome !== 'string' || typeof senha !== 'string' || senha.length > 128 || nome.length > 150) erros.push('Nome ou senha inválidos')
    if (email && !emailValido(email)) {
      erros.push('Email com formato inválido')
    }

    if (senha && senha.length < 6) {
      erros.push('Senha deve ter pelo menos 6 caracteres')
    }

    if (erros.length > 0) {
      return res.status(400).json({
        erros
      })
    }

    const emailNormalizado = email
      .toLowerCase()
      .trim()

    const existe = db.prepare(`
      SELECT id
      FROM usuarios
      WHERE email = ?
    `).get(emailNormalizado)

    if (existe) {
      return res.status(409).json({
        erro: 'Email já cadastrado'
      })
    }

    const senha_hash = await bcrypt.hash(
      senha,
      10
    )

    const resultado = db.prepare(`
      INSERT INTO usuarios (
        nome,
        email,
        senha_hash
      )
      VALUES (?, ?, ?)
    `).run(
      nome.trim(),
      emailNormalizado,
      senha_hash
    )

    res.status(201).json({
      id: resultado.lastInsertRowid,
      nome: nome.trim(),
      email: emailNormalizado
    })

  } catch (err) {
    next(err)
  }
})

// entrar com email e senha
router.post('/login', async (req, res, next) => {
  try {
    const {
      email,
      senha
    } = req.body

    const erros = validarObrigatorios(
      req.body,
      ['email', 'senha']
    )

    if (typeof senha !== 'string') erros.push('Senha inválida')
    if (email && !emailValido(email)) {
      erros.push('Email com formato inválido')
    }

    if (erros.length > 0) {
      return res.status(400).json({
        erros
      })
    }

    const emailNormalizado = email
      .toLowerCase()
      .trim()

    const usuario = db.prepare(`
      SELECT *
      FROM usuarios
      WHERE email = ?
    `).get(emailNormalizado)

    if (!usuario) {
      return res.status(401).json({
        erro: 'Email ou senha inválidos'
      })
    }

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha_hash
    )

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'Email ou senha inválidos'
      })
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    )

    setSession(res, token)
    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    })

  } catch (err) {
    next(err)
  }
})


// entrar com a conta Google
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({ erro: 'Credencial do Google não informada' })
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ erro: 'Login com Google não configurado no servidor' })
    }

    // Valida assinatura, validade e público do token diretamente com o Google.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    const googleSub = payload?.sub
    const email = payload?.email?.toLowerCase().trim()
    const nome = payload?.name?.trim() || email?.split('@')[0] || 'Usuário MedAgenda'

    if (!googleSub || !email || !payload?.email_verified) {
      return res.status(401).json({ erro: 'Conta Google não pôde ser verificada' })
    }

    let usuario = db.prepare('SELECT * FROM usuarios WHERE google_sub = ?').get(googleSub)
      
    // Se já existe usuário com esse email, vincula o Google à conta existente
    if (!usuario) {
      usuario = db.prepare('SELECT * FROM usuarios WHERE email=?').get(email)
    
      if (usuario) {
        db.prepare(`
          UPDATE usuarios 
          SET google_sub=?, auth_provider='google'
          WHERE id=?
        `).run(googleSub, usuario.id)
      }
    }

    let novoUsuario = false

    if (!usuario) {
      // Mantém senha_hash compatível com a estrutura atual, mas ela nunca é usada no login Google.
      const senhaAleatoria = await bcrypt.hash(`google:${googleSub}:${Date.now()}`, 10)
      const resultado = db.prepare(`
        INSERT INTO usuarios (nome, email, senha_hash, google_sub, auth_provider)
        VALUES (?, ?, ?, ?, 'google')
      `).run(nome, email, senhaAleatoria, googleSub)

      usuario = db.prepare(`SELECT * FROM usuarios WHERE id = ?`).get(resultado.lastInsertRowid)
      novoUsuario = true
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    setSession(res, token)
    res.json({
      mensagem: novoUsuario ? 'Conta criada com Google' : 'Login com Google realizado com sucesso',
      novoUsuario,
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    })
  } catch (err) {
    if (err?.message?.toLowerCase().includes('token')) {
      return res.status(401).json({ erro: 'Login com Google inválido ou expirado' })
    }
    next(err)
  }
})

module.exports = router
