import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { SendScreen } from './src/screens/SendScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen, LoginScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Send: 'paper-plane',
  History: 'time',
  Profile: 'person',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.deepGreen, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '800' as const },
        headerTintColor: colors.offWhite,
        tabBarStyle: {
          backgroundColor: colors.anthracite,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: '#5C6B66',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const name = TAB_ICONS[route.name];
          return <Ionicons name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil', headerShown: false }} />
      <Tab.Screen name="Send" component={SendScreen} options={{ title: 'Envoyer' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Historique' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.deepGreen }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
