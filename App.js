import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import RootTabs from './src/navigation/RootTabs';
import { navigationTheme } from './src/theme';
import { PopupHost } from './src/components/Popup';
import ReminderScheduler from './src/notifications/ReminderScheduler';
import ReminderListener from './src/notifications/ReminderListener';

ReminderScheduler.configureForeground();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" />
        <RootTabs />
      </NavigationContainer>
      <ReminderListener />
      <PopupHost />
    </AuthProvider>
  );
}