
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export const lightColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#555555',
  border: '#E5ECF3',
  primary: '#005B9F',
  accent: '#E1F5FE',
  error: '#A32622',
  buttonText: '#FFFFFF',
};

export const darkColors = {
  background: '#030817',
  surface: '#07152A',
  text: '#EAFBFF',
  muted: '#A3B6CC',
  border: '#29425B',
  primary: '#00B4D8',
  accent: '#102B48',
  error: '#FF8A9A',
  buttonText: '#031526',
};

type ThemeContextValue = {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  colors: typeof lightColors;
};

const TekoraThemeContext =
  createContext<ThemeContextValue | undefined>(undefined);

export function TekoraThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkMode, setDarkMode] = useState(false);

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      colors: darkMode ? darkColors : lightColors,
    }),
    [darkMode]
  );

  return (
    <TekoraThemeContext.Provider value={value}>
      {children}
    </TekoraThemeContext.Provider>
  );
}

export function useTekoraTheme() {
  const context = useContext(TekoraThemeContext);

  if (!context) {
    throw new Error(
      'useTekoraTheme debe utilizarse dentro de TekoraThemeProvider.'
    );
  }

  return context;
}
