// configuração e estrutura do banco de dados

const Database = require('better-sqlite3')
const path = require('path')

// No Railway usa o Volume persistente; localmente usa o banco da pasta backend.
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'banco.db')
const db = new Database(dbPath)
db.pragma('busy_timeout = 5000')

db.pragma('foreign_keys = ON')

db.exec(`CREATE TABLE IF NOT EXISTS historico (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, resource TEXT NOT NULL, resource_label TEXT, record_json TEXT NOT NULL, data TEXT NOT NULL, restored INTEGER DEFAULT 0, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)` )
db.exec(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,email TEXT UNIQUE NOT NULL,senha_hash TEXT NOT NULL)`)

// Adiciona suporte ao login com Google sem apagar usuários existentes.
const usuarioCols = db.prepare(`PRAGMA table_info(usuarios)`).all().map(c => c.name)
if (!usuarioCols.includes('google_sub')) db.exec(`ALTER TABLE usuarios ADD COLUMN google_sub TEXT`)
if (!usuarioCols.includes('auth_provider')) db.exec(`ALTER TABLE usuarios ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'`)
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_sub ON usuarios(google_sub) WHERE google_sub IS NOT NULL`)
db.exec(`CREATE TABLE IF NOT EXISTS pacientes (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,cpf TEXT NOT NULL,data_nascimento TEXT NOT NULL,sexo TEXT,telefone TEXT NOT NULL,email TEXT NOT NULL,cep TEXT,rua TEXT,numero TEXT,complemento TEXT,bairro TEXT,cidade TEXT,estado TEXT,usuario_id INTEGER NOT NULL,FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`)
db.exec(`CREATE TABLE IF NOT EXISTS especialidades (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,descricao TEXT,status TEXT NOT NULL DEFAULT 'ativo',usuario_id INTEGER NOT NULL,FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`)
db.exec(`CREATE TABLE IF NOT EXISTS medicos (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,cpf TEXT NOT NULL,crm TEXT NOT NULL,estado_crm TEXT NOT NULL,telefone TEXT NOT NULL,email TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ativo',foto TEXT,especialidade_id INTEGER NOT NULL,usuario_id INTEGER NOT NULL,FOREIGN KEY(especialidade_id) REFERENCES especialidades(id),FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`)
db.exec(`CREATE TABLE IF NOT EXISTS disponibilidades_medicos (id INTEGER PRIMARY KEY AUTOINCREMENT,medico_id INTEGER NOT NULL,dia_semana TEXT NOT NULL,horario_inicio TEXT NOT NULL,horario_fim TEXT NOT NULL,FOREIGN KEY(medico_id) REFERENCES medicos(id) ON DELETE CASCADE)`)
db.exec(`CREATE TABLE IF NOT EXISTS consultas (id INTEGER PRIMARY KEY AUTOINCREMENT,paciente_id INTEGER NOT NULL,medico_id INTEGER NOT NULL,especialidade_id INTEGER NOT NULL,data TEXT NOT NULL,horario TEXT NOT NULL,tipo TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pendente',observacao TEXT,motivo_cancelamento TEXT,usuario_id INTEGER,FOREIGN KEY(paciente_id) REFERENCES pacientes(id),FOREIGN KEY(medico_id) REFERENCES medicos(id),FOREIGN KEY(especialidade_id) REFERENCES especialidades(id),FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`)

// Migração segura para bancos antigos: adiciona usuario_id somente se ainda não existir.
for (const tabela of ['pacientes','especialidades','medicos','consultas']) {
  const cols=db.prepare(`PRAGMA table_info(${tabela})`).all().map(c=>c.name)
  if(!cols.includes('usuario_id')) db.exec(`ALTER TABLE ${tabela} ADD COLUMN usuario_id INTEGER`)
}

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_usuario_cpf ON pacientes(usuario_id,cpf);
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario ON pacientes(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_especialidades_usuario_nome ON especialidades(usuario_id,nome);
CREATE INDEX IF NOT EXISTS idx_especialidades_usuario ON especialidades(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicos_usuario_cpf ON medicos(usuario_id,cpf);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicos_usuario_crm ON medicos(usuario_id,crm);
CREATE INDEX IF NOT EXISTS idx_medicos_usuario ON medicos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_consultas_usuario ON consultas(usuario_id);`)

// Relação N:N: um médico pode ter várias especialidades.
db.exec(`CREATE TABLE IF NOT EXISTS medico_especialidades (
  medico_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  PRIMARY KEY(medico_id,especialidade_id),
  FOREIGN KEY(medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
  FOREIGN KEY(especialidade_id) REFERENCES especialidades(id),
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
)`)
// Preserva a especialidade principal dos médicos já existentes.
db.exec(`INSERT OR IGNORE INTO medico_especialidades(medico_id,especialidade_id,usuario_id)
  SELECT id,especialidade_id,usuario_id FROM medicos WHERE usuario_id IS NOT NULL`)


// -----------------------------------------------------------------------------
// segurança multiusuário no próprio banco
// Além dos filtros das rotas, estes gatilhos impedem vínculos entre contas.
// Assim uma consulta da conta A nunca pode apontar para paciente/médico/
// especialidade da conta B, mesmo que uma rota futura seja implementada errado.
// -----------------------------------------------------------------------------
db.exec(`
CREATE TRIGGER IF NOT EXISTS trg_consulta_conta_insert
BEFORE INSERT ON consultas
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NEW.usuario_id IS NULL THEN RAISE(ABORT, 'Consulta sem usuario_id') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM pacientes WHERE id=NEW.paciente_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Paciente não pertence ao usuário') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Médico não pertence ao usuário') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM especialidades WHERE id=NEW.especialidade_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Especialidade não pertence ao usuário') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_consulta_conta_update
BEFORE UPDATE OF paciente_id,medico_id,especialidade_id,usuario_id ON consultas
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NEW.usuario_id IS NULL THEN RAISE(ABORT, 'Consulta sem usuario_id') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM pacientes WHERE id=NEW.paciente_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Paciente não pertence ao usuário') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Médico não pertence ao usuário') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM especialidades WHERE id=NEW.especialidade_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Especialidade não pertence ao usuário') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_medico_especialidade_conta_insert
BEFORE INSERT ON medico_especialidades
FOR EACH ROW
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Médico não pertence ao usuário') END;
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM especialidades WHERE id=NEW.especialidade_id AND usuario_id=NEW.usuario_id)
    THEN RAISE(ABORT, 'Especialidade não pertence ao usuário') END;
END;
`)

// Coluna adicionada sem apagar disponibilidades antigas.
const disponibilidadeCols = db.prepare('PRAGMA table_info(disponibilidades_medicos)').all().map(c => c.name)
if (!disponibilidadeCols.includes('usuario_id')) db.exec('ALTER TABLE disponibilidades_medicos ADD COLUMN usuario_id INTEGER')
db.exec(`UPDATE disponibilidades_medicos SET usuario_id=(SELECT usuario_id FROM medicos WHERE id=medico_id) WHERE usuario_id IS NULL`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_disponibilidade_conta ON disponibilidades_medicos(usuario_id,medico_id);
CREATE TRIGGER IF NOT EXISTS trg_disponibilidade_insert BEFORE INSERT ON disponibilidades_medicos BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id) THEN RAISE(ABORT,'Médico não pertence ao usuário') END;
END;
CREATE TRIGGER IF NOT EXISTS trg_disponibilidade_update BEFORE UPDATE OF medico_id,usuario_id ON disponibilidades_medicos BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id) THEN RAISE(ABORT,'Médico não pertence ao usuário') END;
END;
CREATE TRIGGER IF NOT EXISTS trg_medico_especialidade_conta_update BEFORE UPDATE ON medico_especialidades BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM medicos WHERE id=NEW.medico_id AND usuario_id=NEW.usuario_id) OR NOT EXISTS (SELECT 1 FROM especialidades WHERE id=NEW.especialidade_id AND usuario_id=NEW.usuario_id) THEN RAISE(ABORT,'Relação entre contas distintas') END;
END;
CREATE INDEX IF NOT EXISTS idx_consulta_agenda ON consultas(usuario_id,medico_id,data,horario);`)

module.exports=db
