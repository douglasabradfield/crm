import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ThemeProvider, UIProvider } from './store/index.js';
import { AuthProvider } from './store/auth.js';
import { CRMProvider }  from './store/crm.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CRMProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </CRMProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
