import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { HomeScreen } from '../screens/home/HomeScreen';
import { UniversalSendScreen } from '../features/send/UniversalSendScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Send: 'paper-plane',
  Accounts: 'wallet',
  Wallet: 'diamond',
  Activity: 'time',
};

export function MainTabs() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.backgroundElevated, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '700', color: theme.colors.text },
        headerTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => {
          const name = TAB_ICONS[route.name];
          const icon = focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap);
          return <Ionicons name={icon} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home'), headerShown: false }} />
      <Tab.Screen name="Send" component={UniversalSendScreen} options={{ title: t('tabs.send') }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: t('tabs.accounts') }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: t('tabs.wallet') }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ title: t('tabs.activity') }} />
    </Tab.Navigator>
  );
}
