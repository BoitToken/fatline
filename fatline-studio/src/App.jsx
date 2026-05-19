import { useState } from 'react'
import Dashboard from './views/Dashboard.jsx'
import CreateProject from './views/CreateProject.jsx'
import DiscoveryWizard from './views/DiscoveryWizard.jsx'
import StudioShell from './views/StudioShell.jsx'

export default function App() {
  const [view, setView] = useState('dashboard') // dashboard | create | discovery | studio
  const [projectId, setProjectId] = useState(null)

  const goDashboard = () => {
    setProjectId(null)
    setView('dashboard')
  }

  const goCreate = () => setView('create')

  const goDiscovery = (id) => {
    setProjectId(id)
    setView('discovery')
  }

  const goStudio = (id) => {
    setProjectId(id)
    setView('studio')
  }

  const handleSelectProject = (id) => {
    // If project already has discovery_complete, skip to studio
    // Otherwise go to discovery. We let StudioShell handle state detection,
    // but for a snappier UX we could pre-check. For now go to studio always.
    goStudio(id)
  }

  const handleCreated = (id) => {
    goDiscovery(id)
  }

  const handleDiscoveryComplete = (id) => {
    goStudio(id)
  }

  const handleDiscoverySkip = (id) => {
    goStudio(id)
  }

  if (view === 'create') {
    return <CreateProject onCreated={handleCreated} onBack={goDashboard} />
  }

  if (view === 'discovery' && projectId) {
    return (
      <DiscoveryWizard
        projectId={projectId}
        onComplete={handleDiscoveryComplete}
        onSkip={handleDiscoverySkip}
      />
    )
  }

  if (view === 'studio' && projectId) {
    return <StudioShell projectId={projectId} onBack={goDashboard} />
  }

  return <Dashboard onSelectProject={handleSelectProject} onCreateProject={goCreate} />
}
