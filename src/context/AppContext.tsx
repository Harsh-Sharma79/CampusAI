import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AnimatePresence } from 'framer-motion';
import { demoStudent } from '../data/mockData';
import type { Student, ThemeChoice, ToastMessage } from '../types';
import { Toast } from '../components/ui';

interface AppContextValue {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  student: Student;
  setStudent: (student: Student) => void;
  toast: (title: string, description?: string, tone?: ToastMessage['tone']) => void;
}
const AppContext = createContext<AppContextValue | null>(null);
const THEME_KEY = 'campusai.theme.v1';
const STUDENT_KEY = 'campusai.student.v1';

export function AppProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });
  const [student, setStudent] = useState<Student>(() => {
    try {
      const value = localStorage.getItem(STUDENT_KEY);
      return value ? { ...demoStudent, ...JSON.parse(value) as Partial<Student> } : demoStudent;
    } catch { return demoStudent; }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.dataset.theme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    apply();
    localStorage.setItem(THEME_KEY, theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
  }, [student]);

  const toast = useCallback((title: string, description?: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((items) => [...items, { id, title, description, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3900);
  }, []);
  const value = useMemo(() => ({ theme, setTheme: setThemeState, student, setStudent, toast }), [theme, student, toast]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((item) => <Toast key={item.id} message={item} onDismiss={() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id))} />)}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
