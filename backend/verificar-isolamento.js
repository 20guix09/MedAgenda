// funções deste arquivo

const db = require('./database')

console.log('\n=== VERIFICAÇÃO DE ISOLAMENTO POR USUÁRIO ===')
for (const tabela of ['pacientes','especialidades','medicos','consultas']) {
  const semDono = db.prepare(`SELECT COUNT(*) total FROM ${tabela} WHERE usuario_id IS NULL`).get().total
  console.log(`${tabela}: registros sem usuário = ${semDono}`)
  const grupos = db.prepare(`SELECT usuario_id, COUNT(*) total FROM ${tabela} GROUP BY usuario_id ORDER BY usuario_id`).all()
  console.table(grupos)
}

const cruzadas = db.prepare(`
 SELECT c.id, c.usuario_id,
        p.usuario_id paciente_usuario,
        m.usuario_id medico_usuario,
        e.usuario_id especialidade_usuario
 FROM consultas c
 JOIN pacientes p ON p.id=c.paciente_id
 JOIN medicos m ON m.id=c.medico_id
 JOIN especialidades e ON e.id=c.especialidade_id
 WHERE c.usuario_id IS NULL
    OR p.usuario_id != c.usuario_id
    OR m.usuario_id != c.usuario_id
    OR e.usuario_id != c.usuario_id
`).all()
console.log('Consultas com vínculo cruzado entre contas:', cruzadas.length)
if (cruzadas.length) console.table(cruzadas)
console.log('\nSe todos os registros tiverem usuario_id e vínculos cruzados = 0, o isolamento está consistente.\n')
