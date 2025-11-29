import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TravelEmail from './pages/EmailViagem';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/email-viagem" element={<TravelEmail />} />
      </Routes>
    </Router>
  );
}

export default App;
