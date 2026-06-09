import { createElement, createContext, useCallback, useContext, useEffect, useState } from 'react';

/* ─── Theme Context ─────────────────────────────────────────────────────────── */
const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const t = getInitialTheme();
    document.documentElement.setAttribute('data-theme', t);
    return t;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return createElement(ThemeContext.Provider, { value: { theme, toggleTheme } }, children);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/* ─── UI Context ─────────────────────────────────────────────────────────────── */
const UIContext = createContext(null);

export function UIProvider({ children }) {
  // promptKey increments on each openAI() call so AIPanel can detect new prompts
  const [aiState, setAiState] = useState({ open: false, prompt: '', promptKey: 0 });

  const openAI = useCallback((prompt = '') => {
    setAiState((prev) => ({ open: true, prompt, promptKey: prev.promptKey + 1 }));
  }, []);

  const closeAI = useCallback(() => {
    setAiState((prev) => ({ ...prev, open: false, prompt: '' }));
  }, []);

  return createElement(UIContext.Provider, { value: { aiState, openAI, closeAI } }, children);
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
