import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'amotpay_onboarding_done';
const KYC_PROMPT_KEY = 'amotpay_kyc_prompt_shown';

export async function isOnboardingComplete(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return v === '1';
}

export async function markOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
}

export async function shouldShowKycPrompt(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KYC_PROMPT_KEY);
  return v !== '1';
}

export async function markKycPromptShown(): Promise<void> {
  await SecureStore.setItemAsync(KYC_PROMPT_KEY, '1');
}

export async function clearSessionFlags(): Promise<void> {
  await SecureStore.deleteItemAsync(KYC_PROMPT_KEY);
}
