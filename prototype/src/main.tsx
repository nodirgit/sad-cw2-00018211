import React from 'react';
import ReactDOM from 'react-dom/client';
import { buildContainer } from './app/container';
import { App } from './presentation/App';
import './styles.css';

const container = buildContainer();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App container={container} />
  </React.StrictMode>,
);
