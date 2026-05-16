import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const ModeContext = createContext();

// Pages only accessible in employer mode
export const EMPLOYER_ONLY_PATHS = ['/post-job'];
// Pages only accessible in jobber mode
export const JOBBER_ONLY_PATHS = ['/marketplace'];

export function ModeProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('apexium_mode') || 'jobber';
  });

  useEffect(() => {
    if (!user?.selected_mode) return;
    if (mode === user.selected_mode) return;
    setMode(user.selected_mode);
    localStorage.setItem('apexium_mode', user.selected_mode);
  }, [user?.selected_mode, mode]);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    localStorage.setItem('apexium_mode', newMode);
    if (user) {
      updateProfile({ selected_mode: newMode }).catch(() => {});
    }
  }, [user, updateProfile]);

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