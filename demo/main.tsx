import React from 'react';
import ReactDOM from 'react-dom/client';
import { DemoApp } from './demo-app';
import '../src/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);
