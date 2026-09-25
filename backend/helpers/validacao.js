// Verifica campos obrigatórios

// valida obrigatorios
function validarObrigatorios(dados, campos) {
  return campos
    .filter(campo => {
      const valor = dados[campo]

      return (
        valor === undefined ||
        valor === null ||
        (typeof valor === 'string' && valor.trim() === '')
      )
    })
    .map(campo => `O campo "${campo}" é obrigatório`)
}


// Valida números dentro de um intervalo

// valida range
function validarRange(campo, valor, min, max) {
  if (
    typeof valor !== 'number' ||
    valor < min ||
    valor > max
  ) {
    return `${campo} deve ser um número entre ${min} e ${max}`
  }

  return null
}


// Valida valores permitidos

// valida lista
function validarLista(campo, valor, permitidos) {
  if (
    valor !== undefined &&
    !permitidos.includes(valor)
  ) {
    return `${campo} deve ser um de: ${permitidos.join(', ')}`
  }

  return null
}


// Valida email

// função para email valido
function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizarCpf(cpf) {
  if (typeof cpf !== 'string' && typeof cpf !== 'number') return ''
  const raw = String(cpf)
  if (!/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(raw)) return ''
  return raw.replace(/\D/g, '')
}

function cpfValido(cpf) {
  const digits = normalizarCpf(cpf)
  if (!digits || /^(\d)\1{10}$/.test(digits)) return false
  for (let n = 9; n <= 10; n++) {
    const sum = [...digits.slice(0, n)].reduce((total, digit, i) => total + Number(digit) * (n + 1 - i), 0)
    const check = (sum * 10) % 11
    if (Number(digits[n]) !== (check === 10 ? 0 : check)) return false
  }
  return true
}

function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  const [ano, mes, dia] = data.split('-').map(Number)
  const date = new Date(Date.UTC(ano, mes - 1, dia))
  return date.getUTCFullYear() === ano && date.getUTCMonth() === mes - 1 && date.getUTCDate() === dia
}

function horarioValido(hora) { return typeof hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) }
function crmValido(crm, uf) {
  return typeof crm === 'string' && /^\d{4,8}$/.test(crm.trim()) &&
    typeof uf === 'string' && /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(uf.toUpperCase())
}


module.exports = {
  validarObrigatorios,
  validarRange,
  validarLista,
  emailValido
  , normalizarCpf, cpfValido, dataValida, horarioValido, crmValido
}
