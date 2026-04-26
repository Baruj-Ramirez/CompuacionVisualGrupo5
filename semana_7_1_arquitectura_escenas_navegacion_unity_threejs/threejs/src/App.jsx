import { Routes, Route } from 'react-router-dom';
import Menu from './assets/Menu';
import Juego from './assets/Juego';
import Creditos from './assets/Creditos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/juego" element={<Juego />} />
      <Route path="/creditos" element={<Creditos />} />
    </Routes>
  );
}

export default App;