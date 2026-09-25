// middleware de autenticação das rotas protegidas

const jwt = require('jsonwebtoken')

// função para autenticar token
function autenticarToken(req, res, next) {
  const cookie = (req.headers.cookie || '').split('; ').find(v => v.startsWith('medagenda_session='))
  if (!cookie) {
    return res.status(401).json({
      erro: 'Sessão não informada'
    })
  }

  const token = cookie.slice('medagenda_session='.length)

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
