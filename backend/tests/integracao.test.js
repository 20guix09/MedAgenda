const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs')
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(),'medagenda-test-'))
process.env.DATABASE_PATH = path.join(dbDir,'test.db')
process.env.JWT_SECRET = 'test-only-secret-12345678901234567890'
process.env.FRONTEND_URL = 'http://localhost:5173'
const app = require('../index')
const server = app.listen(0)
after(async () => { await new Promise(resolve=>server.close(resolve)); require('../database').close(); fs.rmSync(dbDir,{recursive:true,force:true}) })
const origin = () => `http://127.0.0.1:${server.address().port}`
async function request(url,method='GET',body,cookie) {
  const res=await fetch(origin()+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined})
  return {status:res.status,data:res.status===204?null:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]}
}
test('sessão, isolamento, CPF, agenda e histórico confiável',async()=>{
  const anon=await request('/pacientes');assert.equal(anon.status,401)
  const users=[]
  for(const n of [1,2]) {
    assert.equal((await request('/auth/cadastro','POST',{nome:`Conta ${n}`,email:`user${n}@example.com`,senha:'12345678'})).status,201)
    const login=await request('/auth/login','POST',{email:`user${n}@example.com`,senha:'12345678'})
    assert.equal(login.status,200);assert.ok(login.cookie?.startsWith('medagenda_session='));assert.equal(login.data.token,undefined)
    users.push(login.cookie)
  }
  const [a,b]=users
  assert.equal((await request('/auth/me','GET',undefined,a)).status,200)
  assert.equal((await request('/pacientes','POST',{nome:'X',cpf:'11111111111',nasc:'1999-01-01',tel:'123',email:'x@example.com'},a)).status,400)
  const p=await request('/pacientes','POST',{nome:'Paciente',cpf:'52998224725',nasc:'2000-02-29',tel:'11999999999',email:'p@example.com'},a)
  assert.equal(p.status,201);assert.equal(p.data.complemento,null)
  assert.equal((await request(`/pacientes/${p.data.id}`,'GET',undefined,b)).status,404)
  assert.equal((await request(`/pacientes/${p.data.id}`,'PUT',{nome:'Ataque'},b)).status,404)
  const sameCpfOther=await request('/pacientes','POST',{nome:'Outro',cpf:'529.982.247-25',nasc:'2000-02-29',tel:'123',email:'other@example.com'},b)
  assert.equal(sameCpfOther.status,201)
  assert.equal((await request('/pacientes','POST',{nome:'Duplicado',cpf:'529.982.247-25',nasc:'2000-02-29',tel:'123',email:'dup@example.com'},a)).status,409)
  const e=await request('/especialidade','POST',{nome:'Clínica geral'},a);assert.equal(e.status,201)
  const m=await request('/medico','POST',{nome:'Médico',cpf:'11144477735',crm:'123456',estado_crm:'PR',telefone:'11999999999',email:'m@example.com',especialidade_id:e.data.id},a);assert.equal(m.status,201)
  const tomorrow=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
  const consulta={paciente_id:p.data.id,medico_id:m.data.id,especialidade_id:e.data.id,data:tomorrow,horario:'10:00',tipo:'Avaliação'}
  assert.equal((await request('/consultas','POST',consulta,b)).status,400)
  assert.equal((await request('/consultas','POST',{...consulta,paciente_id:sameCpfOther.data.id},a)).status,400)
  const c=await request('/consultas','POST',consulta,a);assert.equal(c.status,201)
  assert.equal((await request('/consultas','POST',consulta,a)).status,409)
  assert.equal((await request(`/consultas/${c.data.id}`,'PUT',{data:'2025-02-30'},a)).status,400)
  assert.equal((await request(`/consultas/${c.data.id}`,'PUT',{paciente_id:sameCpfOther.data.id},a)).status,400)
  assert.equal((await request(`/consultas/${c.data.id}`,'PUT',{status:'inventado'},a)).status,400)
  assert.equal((await request(`/consultas/${c.data.id}/confirmar`,'PATCH',{},a)).status,200)
  assert.equal((await request(`/consultas/${c.data.id}/cancelar`,'PATCH',{},a)).status,200)
  assert.equal((await request('/consultas','POST',consulta,a)).status,201)
  const otherDay=(new Date(`${tomorrow}T12:00:00Z`).getUTCDay()+1)%7
  assert.equal((await request(`/medico/${m.data.id}`,'PUT',{disponibilidades:[{dia_semana:String(otherDay),horario_inicio:'09:00',horario_fim:'18:00'}]},a)).status,200)
  assert.equal((await request('/consultas','POST',{...consulta,horario:'11:00'},a)).status,409)
  assert.equal((await request('/historico','POST',{resource:'pacientes',date:'fake'},a)).status,404)
  assert.equal((await request(`/consultas/${c.data.id}`,'DELETE',undefined,a)).status,200)
  const h=await request('/historico','GET',undefined,a)
  assert.equal(h.status,200);assert.equal(h.data[0].resource,'consultas');assert.equal(h.data[0].usuario_id,1)
  assert.equal((await request('/historico','GET',undefined,b)).data.length,0)
  assert.equal((await request('/auth/logout','POST',{},a)).status,204)
  const denied=await fetch(origin()+'/pacientes',{method:'POST',headers:{Origin:'https://invalid.example',Cookie:a,'Content-Type':'application/json'},body:'{}'})
  assert.equal(denied.status,403)
})
