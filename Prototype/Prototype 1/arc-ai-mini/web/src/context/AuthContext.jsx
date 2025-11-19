import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchProfile } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'mini_hub_token';
const USERNAME_KEY = 'mini_hub_username';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) || null,
  );
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token && username) {
      const initialize = async () => {
        try {
          setIsLoading(true);
          const profile = await fetchProfile(token);
          setStats(profile.stats);
        } catch (err) {
          console.error('Failed to load profile', err);
          logout();
        } finally {
          setIsLoading(false);
        }
      };
      initialize();
    }
  }, [token, username]);

  const login = (nextToken, nextUsername, nextStats = null) => {
    setToken(nextToken);
    setUsername(nextUsername);
    setStats(nextStats);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USERNAME_KEY, nextUsername);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setStats(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      username,
      stats,
      isLoading,
      login,
      logout,
      setStats,
    }),
    [token, username, stats, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

