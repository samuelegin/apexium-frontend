import React, { createContext, useContext, useState, useCallback } from 'react';

const ModeContext = createContext();

// Pages only accessible in employer mode
export const EMPLOYER_ONLY_PATHS = ['/post-job'];
// Pages only accessible in jobber mode
export const JOBBER_ONLY_PATHS = ['/marketplace'];

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('apexium_mode') || 'jobber';
  });

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    localStorage.setItem('apexium_mode', newMode);
  }, []);

  return (
    <ModeContext.Provider value={{
      mode,
      switchMode,
      isEmployer: mode === 'employer',
      isJobber: mode === 'jobber',
    }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}