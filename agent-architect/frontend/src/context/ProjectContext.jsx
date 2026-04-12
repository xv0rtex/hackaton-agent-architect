import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectContext = createContext(null);

const STORAGE_KEY = 'agentArchitect_state';

const DEFAULT_STATE = {
  currentProjectId: null,
  selectedFramework: 'crewai', // local UI state for orchestration page
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_STATE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export function ProjectProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const value = {
    ...state,
    updateState,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export default ProjectContext;
