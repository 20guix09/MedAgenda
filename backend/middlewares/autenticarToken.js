// middleware de autenticação das rotas protegidas

const jwt = require('jsonwebtoken')

// função para autenticar token
function autenticarToken(req, res, next) {
  // Safari no iPhone pode bloquear cookies entre domínios diferentes
  // (Vercel e Railway). Por isso, aceita também o token Bearer enviado pelo app.
  const authorization = req.get('authorization') || ''
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const cookie = (req.headers.cookie || '').split('; ').find(v => v.startsWith('medagenda_session='))
  const token = bearerToken || cookie?.slice('medagenda_session='.length)

  if (!token) {
    return res.status(401).json({
      erro: 'Sessão não informada'
    })
  }

  try {
    const usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.usuario = usuario

    next()

  } catch (err) {
    return res.status(401).json({
      erro: 'Token inválido ou expirado'
    })
  }
}

module.exports = autenticarToken
