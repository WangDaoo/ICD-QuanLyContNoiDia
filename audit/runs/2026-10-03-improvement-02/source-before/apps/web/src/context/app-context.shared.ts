import { createContext } from 'react';
import type { AppContextType } from './AppContext';

// Keep context identity stable when Vite refreshes the provider implementation.
export const AppContext = createContext<AppContextType | undefined>(undefined);
