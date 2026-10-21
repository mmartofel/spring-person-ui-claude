import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export const themes: Theme[] = ['light', 'dark', 'system']

// Also read by the inline script in index.html that applies the theme before React loads.
export const THEME_STORAGE_KEY = 'theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
