import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TravelEmail from './pages/EmailViagem';
import MainLayout from './layouts/MainLayout';
import ClientesCadastrados from './pages/Clientes/ClientesCadastrados';
import NovoCadastro from './pages/Clientes/NovoCadastro';

function App() {
  return (
    <Router basename="/CIRURTEC">
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Rotas com Sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/email-viagem" element={<TravelEmail />} />
          <Route path="/clientes/lista" element={<ClientesCadastrados />} />
          <Route path="/clientes/novo" element={<NovoCadastro />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
