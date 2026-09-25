// dados e funções usados no modo de teste

const MOCK_DELAY = 360;

// função para wait mock
export function waitMock(ms = MOCK_DELAY) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// função para clone
export function clone(data) {
  return structuredClone(data);
}

// função para create id
export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// função para normalize search
export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
