import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import '../index.css'
import App from './App.tsx'

// ⚠️ AQUÍ PEGARÁS EL MISMO CLIENT ID DE GOOGLE
const GOOGLE_CLIENT_ID = "AQUI_IRA_TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)