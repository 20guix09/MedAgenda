// dados e funções usados no modo de teste

import { mockDatabase } from './mockData.js';
import { waitMock } from './mockUtils.js';

export const mockAuthService = {
  async login({ email, nome, senha }) {
    await waitMock();

    if (!email || !senha) {
      throw new Error('Informe e-mail e senha para entrar.');
    }

    const user = mockDatabase.usuarios.find((usuario) => usuario.email === email) ?? {
      id: 'user-demo',
      nome: nome || email.split('@')[0],
      email,
      perfil: 'Administrador',
    };

    return {
      mensagem: 'Login realizado com sucesso',
      token: `mock-jwt-${Date.now()}`,
      user,
    };
  },

  async cadastro({ nome, email, senha }) {
    await waitMock();

    if (!nome || !email || !senha) {
      throw new Error('Preencha nome, e-mail e senha para criar a conta.');
    }

    const user = {
      id: `user-${Date.now()}`,
      nome,
      email,
      perfil: 'Administrador',
    };

    const existingIndex = mockDatabase.usuarios.findIndex((usuario) => usuario.email === email);

    if (existingIndex >= 0) {
      mockDatabase.usuarios[existingIndex] = user;
    } else {
      mockDatabase.usuarios.push(user);
    }

    return {
      mensagem: 'Cadastro realizado com sucesso',
      user,
    };
  },
};
