import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import RedefinirSenha from './pages/RedefinirSenha';
import RegisterUser from './pages/RegisterUser';
import TravelEmail from './pages/EmailViagem';
import MainLayout from './layouts/MainLayout';
import ClientesCadastrados from './pages/Clientes/ClientesCadastrados';
import NovoCadastro from './pages/Clientes/NovoCadastro';
import ProtectedRoute from './components/ProtectedRoute';

import AcertoViagem from './pages/AcertoViagem'; // Added

import Perfil from './pages/Perfil'; 
import Users from './pages/Users';
import EditUser from './pages/EditUser';
import Equipamentos from './pages/Configuracoes/Equipamentos'; 
import EmailGarantia from './pages/Configuracoes/EmailGarantia';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<Home />} />
             <Route element={<MainLayout />}>
               <Route path="/viagens/email" element={<TravelEmail />} /> {/* Updated route */}
               <Route path="/viagens/acerto" element={<AcertoViagem />} /> {/* New route */}
               <Route path="/clientes/lista" element={<ClientesCadastrados />} />
               <Route path="/clientes/novo" element={<NovoCadastro />} />
               <Route path="/clientes/editar/:id" element={<NovoCadastro />} />
               <Route path="/clientes/:id" element={<NovoCadastro />} />
               <Route path="/perfil" element={<Perfil />} /> {/* Profile Route */}
               <Route path="/configuracoes/equipamentos" element={<Equipamentos />} /> {/* Equipment Settings */}
               <Route path="/configuracoes/email-garantia" element={<EmailGarantia />} /> {/* Warranty Email Settings */}
             </Route>
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'Master']} />}>
             <Route element={<MainLayout />}>
                <Route path="/admin/register" element={<RegisterUser />} />
                <Route path="/users" element={<Users />} /> {/* Users Route */}
                <Route path="/users/edit/:id" element={<EditUser />} />
             </Route>
          </Route>


        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
