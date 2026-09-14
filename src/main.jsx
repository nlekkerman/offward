import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'

if ('serviceWorker' in navigator) {
  const workerUrl = new URL('/service-worker.js', window.location.origin).href

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    const legacyRegistrations = registrations.filter((registration) => registration.active?.scriptURL !== workerUrl)
    return Promise.all(legacyRegistrations.map((registration) => registration.unregister()))
  }).then(() => navigator.serviceWorker.register('/service-worker.js')).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
