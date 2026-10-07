export type AppearancePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export function resolveAppearance(preference: unknown, system: 'light' | 'dark' | 'unspecified' | null | undefined): 'LIGHT' | 'DARK' {
  if (preference === 'LIGHT' || preference === 'DARK') return preference;
  return system === 'dark' ? 'DARK' : 'LIGHT';
}
