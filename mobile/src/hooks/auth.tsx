/* eslint-disable @typescript-eslint/ban-types */
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';

import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface AuthState {
  token: string;
  user: User;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface AuthContextData {
  user: User;
  loading: boolean;
  signIn(credentials: SignInCredentials): Promise<void>;
  updateUser(user: User): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext({} as AuthContextData);

export const AuthProvider: React.FC = ({ children }) => {
  const [userData, setUserData] = useState<AuthState>({} as AuthState);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async ({ email, password }) => {
    const response = await api.post('/sessions', {
      email,
      password,
    });

    const { token, user } = response.data;

    await AsyncStorage.multiSet([
      ['@GoBarber:token', token],
      ['@GoBarber:user', JSON.stringify(user)],
    ]);

    api.defaults.headers.authorization = `Bearer ${token}`;

    setUserData({
      token,
      user,
    });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['@GoBarber:token', '@GoBarber:user']);

    setUserData({} as AuthState);
  }, []);

  const updateUser = useCallback(
    async (user: User) => {
      setUserData({
        user,
        token: userData.token,
      });

      await AsyncStorage.setItem('@GoBarber:user', JSON.stringify(user));
    },
    [userData.token],
  );

  useEffect(() => {
    const loadStorages = async (): Promise<void> => {
      const [token, user] = await AsyncStorage.multiGet([
        '@GoBarber:token',
        '@GoBarber:user',
      ]);

      if (token[1] && user[1]) {
        api.defaults.headers.authorization = `Bearer ${token[1]}`;

        setUserData({ token: token[1], user: JSON.parse(user[1]) });
      }

      setLoading(false);
    };

    loadStorages();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user: userData.user, loading, signIn, signOut, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within context');
  }

  return context;
};
