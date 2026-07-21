import { useEffect, useState } from 'react';
import { logout as clearAuth, me } from './api/auth';
import { tokenStore } from './api/client';
import { getProject } from './api/projects';
import AuthScreen from './components/AuthScreen';
import ProjectsScreen from './components/ProjectsScreen';
import Studio from './components/Studio';
import GlobalWidgets from './components/GlobalWidgets';
import './App.css';

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('auth'); // 'auth' | 'projects' | 'studio'
  const [activeProject, setActiveProject] = useState(null);
  const [projectError, setProjectError] = useState(null);

  useEffect(() => {
    (async () => {
      if (tokenStore.getAccess()) {
        try {
          const currentUser = await me();
          setUser(currentUser);
          setScreen('projects');
        } catch {
          clearAuth();
        }
      }
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      setActiveProject(null);
      setScreen('auth');
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const handleLoggedIn = (loggedInUser) => {
    setUser(loggedInUser);
    setScreen('projects');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setActiveProject(null);
    setScreen('auth');
  };

  const handleOpenProject = async (id) => {
    setProjectError(null);
    try {
      const project = await getProject(id);
      setActiveProject(project);
      setScreen('studio');
    } catch (err) {
      setProjectError(err.message);
    }
  };

  const handleBack = () => {
    setActiveProject(null);
    setScreen('projects');
  };

  if (booting) return null;

  if (screen === 'auth' || !user) {
    return <AuthScreen onLoggedIn={handleLoggedIn} />;
  }

  if (screen === 'studio' && activeProject) {
    return (
      <>
        <Studio project={activeProject} onBack={handleBack} />
        <GlobalWidgets user={user} />
      </>
    );
  }

  return (
    <>
      {projectError && <p className="auth-error projects-error">{projectError}</p>}
      <ProjectsScreen user={user} onOpenProject={handleOpenProject} onLogout={handleLogout} />
      <GlobalWidgets user={user} />
    </>
  );
}

export default App;
