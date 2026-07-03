import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ConnectionToast from './src/components/ConnectionToast';

const navigationRef = createNavigationContainerRef();

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TeamScreen from './src/screens/TeamScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import PlanScreen from './src/screens/PlanScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WebsiteScreen from './src/screens/WebsiteScreen';
import ExposantsScreen from './src/screens/ExposantsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabBarIcon({ name, focused, color }) {
  return (
    <View style={[
      styles.iconContainer,
      focused && styles.iconContainerActive,
    ]}>
      <Ionicons name={name} size={24} color={color} style={{ textAlign: 'center' }} />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarSafeAreaInsets: { bottom: 0 },
        tabBarStyle: {
          backgroundColor: '#286EAD',
          height: 70,
          position: 'absolute',
          bottom: 8,
          marginHorizontal: 16,
          borderRadius: 35,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          paddingBottom: 0,
        },
        tabBarItemStyle: {
          height: 70,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 4,
          marginTop: 0,
        },
        tabBarIconStyle: {
          width: 50,
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          let icon;
          if (route.name === 'Dashboard') icon = focused ? 'home' : 'home-outline';
          else if (route.name === 'ScannerTab') icon = focused ? 'qr-code' : 'qr-code-outline';
          else if (route.name === 'Plan') icon = focused ? 'map' : 'map-outline';
          else if (route.name === 'Expos') icon = focused ? 'globe' : 'globe-outline';
          else if (route.name === 'Exposants') icon = focused ? 'storefront' : 'storefront-outline';
          else if (route.name === 'Détails') icon = focused ? 'person' : 'person-outline';
          return <TabBarIcon name={icon} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="ScannerTab" component={ScannerScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Expos" component={WebsiteScreen} />
      <Tab.Screen name="Exposants" component={ExposantsScreen} />
      <Tab.Screen name="Détails" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function ConnectionNotifications() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type !== 'connection') return;
      const { title, body } = notification.request.content;
      setToast({ title, body, data });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'connection' && navigationRef.isReady()) {
        navigationRef.navigate('History');
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <ConnectionToast
      toast={toast}
      onHide={() => setToast(null)}
      onPress={() => {
        setToast(null);
        if (navigationRef.isReady()) navigationRef.navigate('History');
      }}
    />
  );
}

function NavigationRoot() {
  const { isBootstrapping, isAuthenticated } = useAuth();

  if (isBootstrapping) return null;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Scanner" component={ScannerScreen} options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="Team" component={TeamScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {isAuthenticated && <ConnectionNotifications />}
    </View>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <NavigationRoot />
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
