import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PublicApp } from './PublicApp.tsx'
import { initAnalytics } from './lib/analytics'
import { runLegacyCleanup } from './lib/legacyCleanup'

runLegacyCleanup() // efface d'abord les anciennes copies locales de données de chauffeurs
initAnalytics()

// Site PUBLIC uniquement : aucun code d'administration ni donnée de chauffeur dans ce bundle.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicApp />
  </StrictMode>,
)
