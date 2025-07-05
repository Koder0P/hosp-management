import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import your main App component
import 'bootstrap/dist/css/bootstrap.min.css';


const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);