// Rotas de cadastro e gestão de médicos.
const express=require('express')
const router=express.Router()
const db=require('../database')
const {validarObrigatorios,validarLista,emailValido,cpfValido,normalizarCpf,crmValido,horarioValido}=require('../helpers/validacao')
function validarDisponibilidades(slots) {
  if (slots === undefined) return null
  if (!Array.isArray(slots)) return 'Disponibilidades inválidas'
  for (const d of slots) {
    if (!d || !horarioValido(d.horario_inicio) || !horarioValido(d.horario_fim) || d.horario_inicio >= d.horario_fim ||
      !['0','1','2','3','4','5','6','domingo','segunda','terca','quarta','quinta','sexta','sabado'].includes(String(d.dia_semana).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/-feira$/,''))) return 'Disponibilidade inválida'
  }
  return null
}

// função para ids especialidades
function idsEspecialidades(body){
  const ids=Array.isArray(body.especialidade_ids)?body.especialidade_ids:[]
  if(body.especialidade_id!==undefined && body.especialidade_id!==null && body.especialidade_id!=='') ids.unshift(body.especialidade_id)
  return [...new Set(ids.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))]
}
// valida especialidades
function validarEspecialidades(ids,u){
  if(!ids.length)return false
  const qs=ids.map(()=>'?').join(',')
  return db.prepare(`SELECT COUNT(*) total FROM especialidades WHERE usuario_id=? AND id IN (${qs})`).get(u,...ids).total===ids.length
}
// função para sincronizar especialidades
function sincronizarEspecialidades(medicoId,ids,u){
  db.prepare(`DELETE FROM medico_especialidades WHERE medico_id=? AND usuario_id=?`).run(medicoId,u)
  const ins=db.prepare(`INSERT OR IGNORE INTO medico_especialidades(medico_id,especialidade_id,usuario_id) VALUES(?,?,?)`)
  ids.forEach(id=>ins.run(medicoId,id,u))
}
// função para carregar
function carregar(id,u){
  const m=db.prepare(`SELECT m.*, e.nome especialidade FROM medicos m JOIN especialidades e ON e.id=m.especialidade_id AND e.usuario_id=m.usuario_id WHERE m.id=? AND m.usuario_id=?`).get(id,u)
  if(!m)return null
  const es=db.prepare(`SELECT e.id,e.nome FROM medico_especialidades me JOIN especialidades e ON e.id=me.especialidade_id AND e.usuario_id=me.usuario_id WHERE me.medico_id=? AND me.usuario_id=? ORDER BY e.nome`).all(id,u)
  return {...m,especialidades:es,especialidade_ids:es.map(x=>x.id),especialidades_nomes:es.map(x=>x.nome).join(', ')}
}
// visualizar lista de medico
router.get('/',(req,res,next)=>{try{
  const u=req.usuario.id
  const base=db.prepare(`SELECT m.*, e.nome especialidade FROM medicos m JOIN especialidades e ON e.id=m.especialidade_id AND e.usuario_id=m.usuario_id WHERE m.usuario_id=? ORDER BY m.nome`).all(u)
  res.json(base.map(m=>carregar(m.id,u)))
}catch(e){next(e)}})
// visualizar medico por id
router.get('/:id',(req,res,next)=>{try{
  const u=req.usuario.id,id=Number(req.params.id),m=carregar(id,u)
  if(!m)return res.status(404).json({erro:'Médico não encontrado'})
  const disponibilidades=db.prepare(`SELECT id,dia_semana,horario_inicio,horario_fim FROM disponibilidades_medicos WHERE medico_id=? AND usuario_id=?`).all(id,u)
  res.json({...m,disponibilidades})
}catch(e){next(e)}})
// cadastrar medico
router.post('/',(req,res,next)=>{try{
  const u=req.usuario.id,{nome,cpf,crm,estado_crm,telefone,email,status,foto,disponibilidades}=req.body
  const ids=idsEspecialidades(req.body)
  const erros=validarObrigatorios({...req.body,especialidade_id:ids[0]},['nome','cpf','crm','estado_crm','telefone','email','especialidade_id'])
  if(email&&!emailValido(email))erros.push('Email com formato inválido')
  if(!cpfValido(cpf))erros.push('CPF inválido')
  if(!crmValido(crm,estado_crm))erros.push('CRM ou UF inválidos')
  const slotError=validarDisponibilidades(disponibilidades);if(slotError)erros.push(slotError)
  const es=validarLista('status',status,['ativo','inativo']);if(es)erros.push(es)
  if(erros.length)return res.status(400).json({erros})
  if(!validarEspecialidades(ids,u))return res.status(400).json({erro:'Uma ou mais especialidades não pertencem a esta conta'})
  const qsAtivas=ids.map(()=>'?').join(',')
  const totalAtivas=db.prepare(`SELECT COUNT(*) total FROM especialidades WHERE usuario_id=? AND LOWER(status)='ativo' AND id IN (${qsAtivas})`).get(u,...ids).total
  if(totalAtivas!==ids.length)return res.status(400).json({erro:'Selecione somente especialidades ativas'})
  if(db.prepare(`SELECT 1 FROM medicos WHERE cpf=? AND usuario_id=?`).get(normalizarCpf(cpf),u))return res.status(409).json({erro:'CPF já cadastrado'})
  if(db.prepare(`SELECT 1 FROM medicos WHERE crm=? AND usuario_id=?`).get(crm,u))return res.status(409).json({erro:'CRM já cadastrado'})
  const r=db.transaction(()=>{
    const r=db.prepare(`INSERT INTO medicos(nome,cpf,crm,estado_crm,telefone,email,status,foto,especialidade_id,usuario_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(nome,normalizarCpf(cpf),crm,estado_crm.toUpperCase(),telefone,email,status||'ativo',foto||null,ids[0],u)
    sincronizarEspecialidades(r.lastInsertRowid,ids,u)
    if(Array.isArray(disponibilidades)){const ins=db.prepare(`INSERT INTO disponibilidades_medicos(medico_id,dia_semana,horario_inicio,horario_fim,usuario_id) VALUES(?,?,?,?,?)`); disponibilidades.forEach(d=>ins.run(r.lastInsertRowid,d.dia_semana,d.horario_inicio,d.horario_fim,u))}
    return r
  })()
  res.status(201).json(carregar(r.lastInsertRowid,u))
}catch(e){next(e)}})
// editar medico
router.put('/:id',(req,res,next)=>{try{
  const u=req.usuario.id,id=Number(req.params.id),ex=carregar(id,u)
  if(!ex)return res.status(404).json({erro:'Médico não encontrado'})
  const ids=idsEspecialidades(req.body); const finalIds=ids.length?ids:ex.especialidade_ids
  if(!validarEspecialidades(finalIds,u))return res.status(400).json({erro:'Uma ou mais especialidades não pertencem a esta conta'})
  const v={...ex,...req.body}
  if(v.email&&!emailValido(v.email))return res.status(400).json({erro:'Email com formato inválido'})
  if(!cpfValido(v.cpf)||!crmValido(v.crm,v.estado_crm)||!['ativo','inativo'].includes(v.status))return res.status(400).json({erro:'CPF, CRM, UF ou status inválido'})
  const slotError=validarDisponibilidades(req.body.disponibilidades);if(slotError)return res.status(400).json({erro:slotError})
  if(db.prepare(`SELECT 1 FROM medicos WHERE cpf=? AND usuario_id=? AND id!=?`).get(normalizarCpf(v.cpf),u,id))return res.status(409).json({erro:'CPF já cadastrado'})
  if(db.prepare(`SELECT 1 FROM medicos WHERE crm=? AND usuario_id=? AND id!=?`).get(v.crm,u,id))return res.status(409).json({erro:'CRM já cadastrado'})
  db.transaction(()=>{
    db.prepare(`UPDATE medicos SET nome=?,cpf=?,crm=?,estado_crm=?,telefone=?,email=?,status=?,foto=?,especialidade_id=? WHERE id=? AND usuario_id=?`).run(v.nome,normalizarCpf(v.cpf),v.crm,v.estado_crm.toUpperCase(),v.telefone,v.email,v.status,v.foto,finalIds[0],id,u)
    sincronizarEspecialidades(id,finalIds,u)
    if(Array.isArray(req.body.disponibilidades)){
      db.prepare('DELETE FROM disponibilidades_medicos WHERE medico_id=? AND usuario_id=?').run(id,u)
      const ins=db.prepare('INSERT INTO disponibilidades_medicos(medico_id,dia_semana,horario_inicio,horario_fim,usuario_id) VALUES(?,?,?,?,?)')
      req.body.disponibilidades.forEach(d=>ins.run(id,d.dia_semana,d.horario_inicio,d.horario_fim,u))
    }
  })()
  res.json(carregar(id,u))
}catch(e){next(e)}})
// alterar status de medico
router.patch('/:id/status',(req,res,next)=>{try{const u=req.usuario.id,id=Number(req.params.id),{status}=req.body;if(!['ativo','inativo'].includes(status))return res.status(400).json({erro:'Status deve ser ativo ou inativo'});const r=db.prepare(`UPDATE medicos SET status=? WHERE id=? AND usuario_id=?`).run(status,id,u);if(!r.changes)return res.status(404).json({erro:'Médico não encontrado'});res.json(carregar(id,u))}catch(e){next(e)}})
// excluir medico
router.delete('/:id',(req,res,next)=>{try{const u=req.usuario.id,id=Number(req.params.id),ex=carregar(id,u);if(!ex)return res.status(404).json({erro:'Médico não encontrado'});if(db.prepare(`SELECT 1 FROM consultas WHERE medico_id=? AND usuario_id=? LIMIT 1`).get(id,u))return res.status(409).json({erro:'Não é possível excluir o médico porque existem consultas vinculadas. Desative o médico.'});db.prepare(`DELETE FROM medicos WHERE id=? AND usuario_id=?`).run(id,u);res.status(200).json(ex)}catch(e){next(e)}})
module.exports=router
