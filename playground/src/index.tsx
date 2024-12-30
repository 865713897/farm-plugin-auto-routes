import { createRoot } from 'react-dom/client';
import moment from 'moment';
import AppRouter from './router';
import './index.css';

console.log(moment(), 'now');

const container = document.querySelector('#root');
if (container) {
  const root = createRoot(container);
  root.render(<AppRouter />);
}
