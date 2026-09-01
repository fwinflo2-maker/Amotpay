import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { shouldShowKycPrompt } from '../context/session';
import { useTheme } from '../context/ThemeContext';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { KycIntroScreen } from '../screens/verification/KycIntroScreen';
import { VerificationScreen } from '../screens/verification/VerificationScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [kycGate, setKycGate] = useState<'loading' | 'intro' | 'main'>('loading');

  useEffect(() => {
    if (!user) {
      setKycGate('loading');
      return;
    }
    (async () => {
      try {
        const [showPrompt, kyc] = await Promise.all([shouldShowKycPrompt(), api.kycStatus()]);
        setKycGate(showPrompt && !kyc.verified ? 'intro' : 'main');
      } catch {
        setKycGate('main');
      }
    })();
  }, [user]);

  if (loading || (user && kycGate === 'loading')) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : kycGate === 'intro' ? (
        <Stack.Screen name="KycIntro" component={KycIntroScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, presentation: 'modal', title: '' }} />
          <Stack.Screen name="Verification" component={VerificationScreen} options={{ headerShown: true, presentation: 'card', title: '' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
