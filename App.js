import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS, SHADOWS, RADIUS } from './src/constants/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TeamScreen from './src/screens/TeamScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WebsiteScreen from './src/screens/WebsiteScreen';
import ExposantsScreen from './src/screens/ExposantsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabBarIcon({ name, focused, color }) {
  return (
    <View style={[
      styles.iconContainer,
      focused && styles.iconContainerActive
    ]}>
      <Ionicons 
        name={name} 
        size={24} 
        color={color} 
        style={{ textAlign: 'center' }}
      />
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarSafeAreaInsets: { bottom: 0 },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: 70,
          position: 'absolute',
          bottom: 4,
          marginHorizontal: 8,
          borderRadius: 35,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          paddingBottom: 0,
        },
        tabBarItemStyle: {
          height: 70,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 4, // Lower them slightly
          marginTop: 0,
        },
        tabBarIconStyle: {
          width: 50,
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          let icon;
          if (route.name === 'Dashboard') icon = focused ? 'home' : 'home-outline';
          else if (route.name === 'ScannerTab') icon = focused ? 'camera' : 'camera-outline';
          else if (route.name === 'Journal') icon = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Expos') icon = focused ? 'globe' : 'globe-outline';
          else if (route.name === 'Exposants') icon = focused ? 'storefront' : 'storefront-outline';
          else if (route.name === 'Détails') icon = focused ? 'person' : 'person-outline';
          return <TabBarIcon name={icon} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="ScannerTab" component={ScannerScreen} options={{ tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Journal" component={HistoryScreen} />
      <Tab.Screen name="Expos" component={WebsiteScreen} />
      <Tab.Screen name="Exposants" component={ExposantsScreen} />
      <Tab.Screen name="Détails" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { isBootstrapping, isAuthenticated } = useAuth();

  if (isBootstrapping) return null;

  return (
    <NavigationContainer>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationRoot />
      </AuthProvider>
    </SafeAreaProvider>
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
    backgroundColor: '#F0F7FF', 
  },
});
