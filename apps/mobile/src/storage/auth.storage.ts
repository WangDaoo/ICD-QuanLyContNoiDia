import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'icd.accessToken';
const REFRESH_TOKEN_KEY = 'icd.refreshToken';

export const authStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(
      ACCESS_TOKEN_KEY,
    );
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(
      REFRESH_TOKEN_KEY,
    );
  },

  async setTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        accessToken,
      ),
      SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        refreshToken,
      ),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(
        ACCESS_TOKEN_KEY,
      ),
      SecureStore.deleteItemAsync(
        REFRESH_TOKEN_KEY,
      ),
    ]);
  },
};
