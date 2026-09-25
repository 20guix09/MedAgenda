// Rotas de cadastro e gestão de especialidades.
const express = require('express')
const router = express.Router()
const db = require('../database')
const { validarObrigatorios, validarLista } = require('../helpers/validacao')

// visualizar lista de especialidade
router.get('/', (req, res, next) => {
  try {
    const usuarioId = req.usuario.id
    res.json(db.prepare(`SELECT * FROM especialidades WHERE usuario_id = ? ORDER BY nome`).all(usuarioId))
  } catch (err) { next(err) }
})

// visualizar especialidade por id
router.get('/:id', (req, res, next) => {
  try {
    const usuarioId = req.usuario.id
    const especialidade = db.prepare(`SELECT * FROM especialidades WHERE id = ? AND usuario_id = ?`).get(Number(req.params.id), usuarioId)
    if (!especialidade) return res.status(404).json({ erro: 'Especialidade não encontrada' })
    res.json(especialidade)
  } catch (err) { next(err) }
})

// cadastrar especialidade
router.post('/', (req, res, next) => {
  try {
    const usuarioId = req.usuario.id
    const { nome, descricao, status } = req.body
    const erros = validarObrigatorios(req.body, ['nome'])
    const erroStatus = validarLista('status', status, ['ativo', 'inativo'])
    if (erroStatus) erros.push(erroStatus)
    if (erros.length) return res.status(400).json({ erros })

    const duplicada = db.prepare(`SELECT id FROM especialidades WHERE nome = ? COLLATE NOCASE AND usuario_id = ?`).get(nome.trim(), usuarioId)
    if (duplicada) return res.status(409).json({ erro: 'Especialidade já cadastrada nesta conta' })

    const r = db.prepare(`INSERT INTO especialidades (nome, descricao, status, usuario_id) VALUES (?, ?, ?, ?)`).run(
      nome.trim(), descricao?.trim() || null, status || 'ativo', usuarioId
    )
    res.status(201).json(db.prepare(`SELECT * FROM especialidades WHERE id = ? AND usuario_id = ?`).get(r.lastInsertRowid, usuarioId))
  } catch (err) { next(err) }
})

// editar especialidade
router.put('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id), usuarioId = req.usuario.id
    const existente = db.prepare(`SELECT * FROM especialidades WHERE id = ? AND usuario_id = ?`).get(id, usuarioId)
    if (!existente) return res.status(404).json({ erro: 'Especialidade não encontrada' })
    const { nome, descricao, status } = req.body
    if (status !== undefined && !['ativo','inativo'].includes(status)) return res.status(400).json({erro:'Status inválido'})
    if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) return res.status(400).json({erro:'Nome inválido'})
    if (nome) {
      const duplicada = db.prepare(`SELECT id FROM especialidades WHERE nome = ? COLLATE NOCASE AND usuario_id = ? AND id != ?`).get(nome.trim(), usuarioId, id)
      if (duplicada) return res.status(409).json({ erro: 'Especialidade já cadastrada nesta conta' })
    }
    db.prepare(`UPDATE especialidades SET nome=?, descricao=?, status=? WHERE id=? AND usuario_id=?`).run(
      nome?.trim() || existente.nome, descricao ?? existente.descricao, status ?? existente.status, id, usuarioId
    )
    res.json(db.prepare(`SELECT * FROM especialidades WHERE id=? AND usuario_id=?`).get(id, usuarioId))
  } catch (err) { next(err) }
})

// excluir especialidade
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id), usuarioId = req.usuario.id
    const existente = db.prepare(`SELECT * FROM especialidades WHERE id=? AND usuario_id=?`).get(id, usuarioId)
    if (!existente) return res.status(404).json({ erro: 'Especialidade não encontrada' })
    if (db.prepare(`SELECT 1 FROM medico_especialidades WHERE especialidade_id=? AND usuario_id=? LIMIT 1`).get(id, usuarioId) ||
        db.prepare(`SELECT 1 FROM medicos WHERE especialidade_id=? AND usuario_id=? LIMIT 1`).get(id, usuarioId)) {
      return res.status(409).json({ erro: 'Não é possível excluir a especialidade porque existem médicos vinculados' })
    }
    if (db.prepare(`SELECT 1 FROM consultas WHERE especialidade_id=? AND usuario_id=? LIMIT 1`).get(id, usuarioId)) {
      return res.status(409).json({ erro: 'Não é possível excluir a especialidade porque existem consultas vinculadas' })
    }
    db.prepare(`DELETE FROM especialidades WHERE id=? AND usuario_id=?`).run(id, usuarioId)
    res.status(204).send()
  } catch (err) { next(err) }
})
module.exports = router
