import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Site-wide light/dark theme. The actual colors live in CSS custom properties
 * (see src/index.css) keyed off `data-theme` on <html>; this just owns the
 * choice, persists it, and reflects it onto the document element. Default is
 * dark (the original look). An inline script in index.html applies the saved
 * theme before paint to avoid a flash.
 */

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'rl.theme';

type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

function getInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  // Fall back to whatever the pre-paint script set, else dark.
  const attr = document.documentElement.dataset.theme;
  return attr === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const value: ThemeCtx = {
    theme,
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
