import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* Froala editor styles */
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";

/* import plugin */
import 'froala-editor/js/plugins.pkgd.min.js';

/* optional theme/icon fonts */
import "font-awesome/css/font-awesome.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
