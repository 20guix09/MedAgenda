const express = require('express')
const db = require('../database')
const router = express.Router()
router.get('/', (req,res,next) => {
  try { res.json(db.prepare('SELECT * FROM historico WHERE usuario_id=? ORDER BY id DESC').all(req.usuario.id).map(item=>({ ...item, record:JSON.parse(item.record_json) }))) }
  catch(err) { next(err) }
})
router.patch('/:id/restaurado', (req,res,next) => {
  try {
    const result=db.prepare('UPDATE historico SET restored=1 WHERE id=? AND usuario_id=? AND restored=0').run(Number(req.params.id),req.usuario.id)
    if(!result.changes)return res.status(404).json({erro:'Registro não encontrado'})
    res.status(204).send()
  } catch(err) { next(err) }
})
module.exports=router
