// contexto compartilhado do sistema

import { AuthProvider } from './AuthContext.jsx';

// componente app providers
export default function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
