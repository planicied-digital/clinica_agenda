import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MedicoDashboardPage } from './pages/MedicoDashboardPage';

function Roteador() {
  const { sessao } = useAuth();
  if (!sessao) return <LoginPage />;
  return sessao.usuario.papel === 'MEDICO' ? <MedicoDashboardPage /> : <DashboardPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Roteador />
    </AuthProvider>
  );
}
