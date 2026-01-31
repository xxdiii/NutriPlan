import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const USER_PROFILE_KEY = 'userProfile';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfileState] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_PROFILE_KEY);
      setUserProfileState(raw ? JSON.parse(raw) : null);
    } catch {
      setUserProfileState(null);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  const setUserProfile = (nextProfile) => {
    setUserProfileState(nextProfile);
    if (!nextProfile) {
      localStorage.removeItem(USER_PROFILE_KEY);
      return;
    }
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextProfile));
  };

  const clearUserProfile = () => setUserProfile(null);

  const value = useMemo(
    () => ({
      userProfile,
      isUserLoading,
      setUserProfile,
      clearUserProfile,
    }),
    [userProfile, isUserLoading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUserContext must be used within a <UserProvider />');
  }
  return ctx;
};

