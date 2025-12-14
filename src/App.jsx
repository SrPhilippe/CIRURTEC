import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterUser from './pages/RegisterUser';
import TravelEmail from './pages/EmailViagem';
import MainLayout from './layouts/MainLayout';
import ClientesCadastrados from './pages/Clientes/ClientesCadastrados';
import NovoCadastro from './pages/Clientes/NovoCadastro';
import ProtectedRoute from './components/ProtectedRoute';

import Settings from './pages/Settings';
import Users from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <Router basename="/CIRURTEC">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
             <Route path="/" element={<Home />} />
             <Route element={<MainLayout />}>
               <Route path="/email-viagem" element={<TravelEmail />} />
               <Route path="/clientes/lista" element={<ClientesCadastrados />} />
               <Route path="/clientes/novo" element={<NovoCadastro />} />
               <Route path="/clientes/editar/:id" element={<NovoCadastro />} />
               <Route path="/clientes/:id" element={<NovoCadastro />} />
               <Route path="/settings" element={<Settings />} /> {/* Settings Route */}
             </Route>
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'Master']} />}>
             <Route element={<MainLayout />}>
                <Route path="/admin/register" element={<RegisterUser />} />
                <Route path="/users" element={<Users />} /> {/* Users Route */}
             </Route>
          </Route>


        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
