import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
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
import { MenuProvider } from './src/context/MenuContext';
import FloatingTabBar from './src/components/FloatingTabBar';
import ConnectionToast from './src/components/ConnectionToast';
import { withPageTransition } from './src/components/PageTransition';
import { stackTransition, tabTransition } from './src/navigation/transitions';
import { navigationRef } from './src/navigation/navigationRef';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ClaimAccountScreen from './src/screens/ClaimAccountScreen';
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
import SessionsScreen from './src/screens/SessionsScreen';
import InstitutionalB2BScreen from './src/screens/InstitutionalB2BScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ConferenceScreen from './src/screens/ConferenceScreen';
import ProgrammeScreen from './src/screens/ProgrammeScreen';
import ParticipateScreen from './src/screens/ParticipateScreen';
import B2BAgendaScreen from './src/screens/B2BAgendaScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Screens animate their content in on focus. ScannerScreen is left untouched —
// fading a live camera preview flickers on Android.
const Home = withPageTransition(HomeScreen);
const Plan = withPageTransition(PlanScreen);
const Website = withPageTransition(WebsiteScreen);
const Exposants = withPageTransition(ExposantsScreen);
const Appointments = withPageTransition(AppointmentsScreen);
const Profile = withPageTransition(ProfileScreen);
const History = withPageTransition(HistoryScreen);
const MyBadge = withPageTransition(MyBadgeScreen);
const Team = withPageTransition(TeamScreen);
const Terms = withPageTransition(TermsScreen);
const EditProfile = withPageTransition(EditProfileScreen);
const Sessions = withPageTransition(SessionsScreen);
const InstitutionalB2B = withPageTransition(InstitutionalB2BScreen);
const NotificationsHistory = withPageTransition(NotificationsScreen);
const Conference = withPageTransition(ConferenceScreen);
const Programme = withPageTransition(ProgrammeScreen);
const Participate = withPageTransition(ParticipateScreen);
const B2BAgenda = withPageTransition(B2BAgendaScreen);
const Login = withPageTransition(LoginScreen);
const Register = withPageTransition(RegisterScreen);
const ForgotPassword = withPageTransition(ForgotPasswordScreen);
const ClaimAccount = withPageTransition(ClaimAccountScreen);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, ...tabTransition }}
      tabBar={(props) => <FloatingTabBar {...props} />}
      // Default detach destroys and rebuilds each tab's native view when it
      // loses/regains focus. That rebuild can desync Reanimated shared
      // values (AppMenu's open/close `progress`) from the new native view,
      // which is why the drawer stopped animating open only after a tab
      // switch away from Dashboard and back. A handful of lightweight tabs
      // doesn't need the memory optimization detach buys.
      detachInactiveScreens={false}
    >
      <Tab.Screen name="Dashboard" component={Home} />
      <Tab.Screen name="ScannerTab" component={ScannerScreen} />
      <Tab.Screen name="Plan" component={Plan} />
      <Tab.Screen name="Expos" component={Website} />
      <Tab.Screen name="Exposants" component={Exposants} />
      <Tab.Screen name="RDV" component={Appointments} />
      <Tab.Screen name="Détails" component={Profile} />
      {/* Sub-page kept inside the tabs so the floating navbar stays visible.
          Hidden from the bar itself via the ICONS filter in FloatingTabBar. */}
      <Tab.Screen name="History" component={History} />
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

// Hex of the --background token in global.css, so screens fading in/out never
// flash the navigator's default white card underneath.
const NAV_THEME = {
  light: {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#F2F6F8', card: '#F2F6F8' },
  },
  dark: {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: '#09141C', card: '#09141C' },
  },
};

function NavigationRoot() {
  const { isBootstrapping, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  if (isBootstrapping) return null;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} theme={isDark ? NAV_THEME.dark : NAV_THEME.light}>
        <Stack.Navigator screenOptions={{ headerShown: false, ...stackTransition }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Register" component={Register} />
              <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
              <Stack.Screen name="ClaimAccount" component={ClaimAccount} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Scanner" component={ScannerScreen} options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="Team" component={Team} />
              <Stack.Screen name="Terms" component={Terms} />
              <Stack.Screen name="MyBadge" component={MyBadge} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="Sessions" component={Sessions} />
              <Stack.Screen name="InstitutionalB2B" component={InstitutionalB2B} />
              <Stack.Screen name="Notifications" component={NotificationsHistory} />
              <Stack.Screen name="Conference" component={Conference} />
              <Stack.Screen name="Programme" component={Programme} />
              <Stack.Screen name="Participate" component={Participate} />
              <Stack.Screen name="B2BAgenda" component={B2BAgenda} />
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
  // No translucent/backgroundColor: those call APIs Android 15 deprecated under
  // edge-to-edge, which is already on for the whole app.
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
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
                  {/* The slide-out menu is mounted once, above the navigator,
                      so every screen can open it and it draws over the
                      floating tab bar. */}
                  <MenuProvider>
                    <ThemedStatusBar />
                    <NavigationRoot />
                  </MenuProvider>
                </TabBarProvider>
              </AuthProvider>
            </SafeAreaProvider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
