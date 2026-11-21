import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ParkingSpacesScreen from '../screens/ParkingSpacesScreen';
import CustomerInfoScreen from '../screens/CustomerInfoScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AdminBookingScreen from '../screens/AdminBookingScreen';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Popup';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HOME_SCREENS = { HomeMain: HomeScreen };
const PARKING_SCREENS = { ParkingSpaces: ParkingSpacesScreen, CustomerInfo: CustomerInfoScreen };
const ACCOUNT_SCREENS = { Login: LoginScreen, SignUp: SignUpScreen };
const SCAN_SCREENS = { ScanMain: AdminBookingScreen };

function AppStack({ screens, headerOptions }) {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      {Object.entries(screens).map(([name, component]) => (
        <Stack.Screen key={name} name={name} component={component} />
      ))}
    </Stack.Navigator>
  );
}

function HeaderRightMenu({ loggedIn, onMenuPress }) {
  if (!loggedIn) return null;
  return (
    <TouchableOpacity onPress={onMenuPress} style={styles.menuButton} hitSlop={10}>
      <Ionicons name="menu" size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const tabIcon = (name) => ({ color, size }) => <Ionicons name={name} size={size} color={color} />;

export default function RootTabs() {
  const { user, isAdmin, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = () => setMenuVisible(false);
  const handleLogout = () => {
    closeMenu();
    // small delay so the menu finishes closing before the popup opens
    setTimeout(() => {
      Alert.alert('Log out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: logout },
      ]);
    }, 250);
  };

  const headerOptions = {
    headerTitle: 'ParkPro',
    headerTitleAlign: 'center',
    headerTitleStyle: { fontWeight: 'bold', fontSize: 20, color: '#FFD000' },
    headerBackButtonDisplayMode: 'minimal',
    headerLeft: () => (
      <Image source={require('../../assets/logo1.png')} style={styles.logo} resizeMode="contain" />
    ),
    headerRight: () => (
      <HeaderRightMenu loggedIn={!!user} onMenuPress={() => setMenuVisible(true)} />
    ),
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FFD000',
          tabBarInactiveTintColor: '#BDBDBD',
        }}
      >
        <Tab.Screen name="Home" options={{ tabBarIcon: tabIcon('home') }}>
          {() => <AppStack screens={HOME_SCREENS} headerOptions={headerOptions} />}
        </Tab.Screen>

        <Tab.Screen name="Parking" options={{ tabBarIcon: tabIcon('car') }}>
          {() => <AppStack screens={PARKING_SCREENS} headerOptions={headerOptions} />}
        </Tab.Screen>

        {isAdmin && (
          <Tab.Screen name="Parking Management" options={{ tabBarIcon: tabIcon('scan') }}>
            {() => <AppStack screens={SCAN_SCREENS} headerOptions={headerOptions} />}
          </Tab.Screen>
        )}

        {!user && (
          <Tab.Screen name="Account" options={{ title: 'Login', tabBarIcon: tabIcon('log-in') }}>
            {() => <AppStack screens={ACCOUNT_SCREENS} headerOptions={headerOptions} />}
          </Tab.Screen>
        )}
      </Tab.Navigator>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text style={styles.dropdownText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 32, height: 32, marginLeft: 12, borderRadius: 8 },
  menuButton: { marginRight: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'flex-end' },
  dropdown: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#FFD000',
    borderRadius: 12,
    marginTop: 90,
    marginRight: 12,
    paddingVertical: 6,
    minWidth: 180,
    elevation: 6,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownText: { color: '#dc2626', fontWeight: '600', fontSize: 15, marginLeft: 10 },
});