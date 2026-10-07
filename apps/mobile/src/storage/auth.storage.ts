import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'icd.accessToken';
const REFRESH_TOKEN_KEY = 'icd.refreshToken';
const getToken = (key: string) => Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
const setToken = (key: string, value: string) => Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
const removeToken = (key: string) => Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
let tokenGeneration = 0;
let tokenMutation: Promise<void> = Promise.resolve();
const mutateTokens = (action: () => Promise<void>): Promise<void> => {
  const next = tokenMutation.then(action, action);
  tokenMutation = next.catch(() => {});
  return next;
};

export const authStorage = {
  async getAccessToken(): Promise<string | null> {
    return getToken(
      ACCESS_TOKEN_KEY,
    );
  },

  async getRefreshToken(): Promise<string | null> {
    return getToken(
      REFRESH_TOKEN_KEY,
    );
  },

  async setTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    const generation = tokenGeneration;
    await mutateTokens(async () => {
      if (generation !== tokenGeneration) return;
      await Promise.all([
      setToken(
        ACCESS_TOKEN_KEY,
        accessToken,
      ),
      setToken(
        REFRESH_TOKEN_KEY,
        refreshToken,
      ),
      ]);
    });
  },

  async clear(): Promise<void> {
    tokenGeneration++;
    await mutateTokens(async () => {
      await Promise.all([
      removeToken(
        ACCESS_TOKEN_KEY,
      ),
      removeToken(
        REFRESH_TOKEN_KEY,
      ),
      ]);
    });
  },
};
