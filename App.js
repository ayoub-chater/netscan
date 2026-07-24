import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import * as Notifications from 'expo-notifications';

import './src/i18n';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { TabBarProvider } from './src/context/TabBarContext';
import FloatingTabBar from './src/components/FloatingTabBar';
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
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TermsScreen from './src/screens/TermsScreen';
import MyBadgeScreen from './src/screens/MyBadgeScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="ScannerTab" component={ScannerScreen} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Expos" component={WebsiteScreen} />
      <Tab.Screen name="Exposants" component={ExposantsScreen} />
      <Tab.Screen name="RDV" component={AppointmentsScreen} />
      <Tab.Screen name="Détails" component={ProfileScreen} />
      {/* Sub-page kept inside the tabs so the floating navbar stays visible.
          Hidden from the bar itself via the ICONS filter in FloatingTabBar. */}
      <Tab.Screen name="History" component={HistoryScreen} />
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
      if (!navigationRef.isReady()) return;
      if (data?.type === 'connection') {
        navigationRef.navigate('Main', { screen: 'History' });
      } else if (data?.type === 'appointment') {
        navigationRef.navigate('Main', { screen: 'RDV' });
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
        if (navigationRef.isReady()) navigationRef.navigate('Main', { screen: 'History' });
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
              <Stack.Screen name="Terms" component={TermsScreen} />
              <Stack.Screen name="MyBadge" component={MyBadgeScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
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
      <LanguageProvider>
        <HeroUINativeProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <AuthProvider>
                <TabBarProvider>
                  <ThemedStatusBar />
                  <NavigationRoot />
                </TabBarProvider>
              </AuthProvider>
            </SafeAreaProvider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
