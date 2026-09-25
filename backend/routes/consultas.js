const express = require('express')
const router = express.Router()
const db = require('../database')
const { dataValida, horarioValido } = require('../helpers/validacao')
const statuses = ['pendente','confirmada','finalizada','cancelada']
const active = ['pendente','confirmada']
function completo(id,u) {
  return db.prepare(`SELECT c.*,p.nome paciente,m.nome medico,e.nome especialidade FROM consultas c
    JOIN pacientes p ON p.id=c.paciente_id AND p.usuario_id=c.usuario_id
    JOIN medicos m ON m.id=c.medico_id AND m.usuario_id=c.usuario_id
    JOIN especialidades e ON e.id=c.especialidade_id AND e.usuario_id=c.usuario_id
    WHERE c.id=? AND c.usuario_id=?`).get(id,u)
}
function nowLocal() {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:process.env.APP_TIME_ZONE || 'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date())
  const p=Object.fromEntries(parts.map(({type,value})=>[type,value]))
  return [`${p.year}-${p.month}-${p.day}`,`${p.hour}:${p.minute}`]
}
function validar(v,u,id,original) {
  for (const key of ['paciente_id','medico_id','especialidade_id']) {
    if (!Number.isSafeInteger(Number(v[key])) || Number(v[key]) < 1) return [400,`${key} inválido`]
  }
  if (!dataValida(v.data) || !horarioValido(v.horario)) return [400,'Data ou horário inválido']
  if (typeof v.tipo !== 'string' || !v.tipo.trim() || v.tipo.length > 100) return [400,'Tipo inválido']
  if (!statuses.includes(v.status)) return [400,'Status inválido']
  if (original && original.status !== v.status) {
    const next={ pendente:['confirmada','cancelada'], confirmada:['finalizada','cancelada'], finalizada:[], cancelada:[] }
    if (!next[original.status]?.includes(v.status)) return [409,'Transição de status inválida']
  }
  const changingTime=!original || ['data','horario','medico_id','paciente_id','especialidade_id'].some(k=>String(v[k])!==String(original[k]))
  const [today,hour]=nowLocal()
  if (active.includes(v.status) && changingTime && (v.data < today || (v.data===today && v.horario < hour))) return [400,'Consulta não pode ser agendada no passado']
  const patient=db.prepare('SELECT id FROM pacientes WHERE id=? AND usuario_id=?').get(v.paciente_id,u)
  const doctor=db.prepare('SELECT status FROM medicos WHERE id=? AND usuario_id=?').get(v.medico_id,u)
  const specialty=db.prepare('SELECT status FROM especialidades WHERE id=? AND usuario_id=?').get(v.especialidade_id,u)
  if (!patient || !doctor || !specialty) return [400,'Paciente, médico ou especialidade não pertence à conta']
  const linked=db.prepare('SELECT 1 FROM medico_especialidades WHERE medico_id=? AND especialidade_id=? AND usuario_id=?').get(v.medico_id,v.especialidade_id,u)
  const primary=db.prepare('SELECT 1 FROM medicos WHERE id=? AND especialidade_id=? AND usuario_id=?').get(v.medico_id,v.especialidade_id,u)
  if (!linked && !primary) return [400,'Médico não possui esta especialidade']
  if (changingTime && (doctor.status!=='ativo' || specialty.status!=='ativo')) return [400,'Médico ou especialidade inativa']
  if (active.includes(v.status)) {
    const clash=db.prepare(`SELECT 1 FROM consultas WHERE usuario_id=? AND medico_id=? AND data=? AND horario=? AND id!=? AND status IN ('pendente','confirmada')`).get(u,v.medico_id,v.data,v.horario,id||0)
    if (clash) return [409,'O médico já possui consulta neste horário']
    const slots=db.prepare('SELECT dia_semana,horario_inicio,horario_fim FROM disponibilidades_medicos WHERE medico_id=? AND usuario_id=?').all(v.medico_id,u)
    if (slots.length) {
      const weekday=new Date(`${v.data}T12:00:00Z`).getUTCDay()
      const names=['domingo','segunda','terca','quarta','quinta','sexta','sabado']
      const fits=slots.some(s => {
        const day=String(s.dia_semana).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/-feira$/,'')
        return [String(weekday),names[weekday]].includes(day) && v.horario>=s.horario_inicio && v.horario<s.horario_fim
      })
      if (!fits) return [409,'Horário fora da disponibilidade cadastrada']
    }
  }
  return null
}
router.get('/',(req,res)=>res.json(db.prepare(`SELECT c.*,p.nome paciente,m.nome medico,e.nome especialidade FROM consultas c
 JOIN pacientes p ON p.id=c.paciente_id AND p.usuario_id=c.usuario_id JOIN medicos m ON m.id=c.medico_id AND m.usuario_id=c.usuario_id
 JOIN especialidades e ON e.id=c.especialidade_id AND e.usuario_id=c.usuario_id WHERE c.usuario_id=? ORDER BY c.data,c.horario`).all(req.usuario.id)))
router.get('/:id',(req,res)=>{const c=completo(Number(req.params.id),req.usuario.id);return c?res.json(c):res.status(404).json({erro:'Consulta não encontrada'})})
function save(req,res,next,id) {
  try {
    const u=req.usuario.id
    const tx=db.transaction(()=>{
      const old=id?db.prepare('SELECT * FROM consultas WHERE id=? AND usuario_id=?').get(id,u):null
      if(id&&!old)return {error:[404,'Consulta não encontrada']}
      const v={...old,...req.body,status:old?.status || 'pendente'}
      if(old && Object.hasOwn(req.body,'status')) v.status=req.body.status
      const error=validar(v,u,id,old)
      if(error)return {error}
      if(id)db.prepare(`UPDATE consultas SET paciente_id=?,medico_id=?,especialidade_id=?,data=?,horario=?,tipo=?,status=?,observacao=? WHERE id=? AND usuario_id=?`)
        .run(v.paciente_id,v.medico_id,v.especialidade_id,v.data,v.horario,v.tipo,v.status,v.observacao??null,id,u)
      else id=db.prepare(`INSERT INTO consultas(paciente_id,medico_id,especialidade_id,data,horario,tipo,status,observacao,usuario_id) VALUES(?,?,?,?,?,?,?,?,?)`)
        .run(v.paciente_id,v.medico_id,v.especialidade_id,v.data,v.horario,v.tipo,'pendente',v.observacao??null,u).lastInsertRowid
      return {row:completo(id,u)}
    }).immediate()
    if(tx.error)return res.status(tx.error[0]).json({erro:tx.error[1]})
    res.status(req.method==='POST'?201:200).json(tx.row)
  }catch(err){next(err)}
}
router.post('/',(req,res,next)=>save(req,res,next,null))
router.put('/:id',(req,res,next)=>save(req,res,next,Number(req.params.id)))
function transition(req,res,next,status) {
  try {
    const id=Number(req.params.id),u=req.usuario.id
    const tx=db.transaction(()=>{
      const old=db.prepare('SELECT * FROM consultas WHERE id=? AND usuario_id=?').get(id,u)
      if(!old)return {error:[404,'Consulta não encontrada']}
      const v={...old,status}
      const error=validar(v,u,id,old)
      if(error)return {error}
      db.prepare('UPDATE consultas SET status=?,motivo_cancelamento=? WHERE id=? AND usuario_id=?').run(status,
        status==='cancelada' ? String(req.body?.motivoCancelamento ?? req.body?.motivo ?? '').slice(0,500) : old.motivo_cancelamento,id,u)
      return {row:completo(id,u)}
    }).immediate()
    return tx.error?res.status(tx.error[0]).json({erro:tx.error[1]}):res.json(tx.row)
  }catch(err){next(err)}
}
for(const [path,status] of [['confirmar','confirmada'],['finalizar','finalizada'],['cancelar','cancelada']])
  router.patch(`/:id/${path}`,(req,res,next)=>transition(req,res,next,status))
router.delete('/:id',(req,res,next)=>{try{
 const id=Number(req.params.id),u=req.usuario.id,c=completo(id,u)
 if(!c)return res.status(404).json({erro:'Consulta não encontrada'})
 db.prepare('DELETE FROM consultas WHERE id=? AND usuario_id=?').run(id,u)
 res.json(c)
}catch(err){next(err)}})
module.exports=router
