import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './shell.css'
import './modules/home/index.css'
import App from './App'
import { registerServiceWorker } from './modules/home/lib/push'
import { unlockAudioOnFirstTap } from './modules/home/lib/sound'

registerServiceWorker()
unlockAudioOnFirstTap()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
