import { DefaultTheme } from '@react-navigation/native';

export const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FFD000',
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#2A2A2A',
    notification: '#FFD000',
  },
};