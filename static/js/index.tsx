import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import '../css/custom.css'; // Update path to be relative to /static/js location

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

