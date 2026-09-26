import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Required for React Fast Refresh: without this boundary, Vite performs a
// full page reload on every HMR update, which unmounts inputs and drops
// focus after each keystroke.
if (import.meta.hot) {
  import.meta.hot.accept()
}
