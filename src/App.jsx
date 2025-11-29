import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TravelEmail from './pages/EmailViagem';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Rotas com Sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/email-viagem" element={<TravelEmail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
