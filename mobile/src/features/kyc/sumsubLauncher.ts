import type { KycStart } from '../../api/types';

type LaunchResult = 'completed' | 'cancelled' | 'unavailable';

export async function launchSumsubVerification(session: KycStart): Promise<LaunchResult> {
  try {
    // Native module — requires Expo dev/EAS build (not Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SNSMobileSDK = require('@sumsub/react-native-mobilesdk-module').default;
    const sdk = SNSMobileSDK.init(session.access_token, async () => session.access_token)
      .withHandlers({
        onStatusChanged: () => undefined,
      })
      .withLocale('en')
      .build();

    const result = await sdk.launch();
    const status = String(result?.status ?? result?.newStatus ?? '').toUpperCase();
    if (status.includes('CANCEL')) return 'cancelled';
    return 'completed';
  } catch {
    return 'unavailable';
  }
}

export function isSumsubNativeAvailable(): boolean {
  try {
    require.resolve('@sumsub/react-native-mobilesdk-module');
    return true;
  } catch {
    return false;
  }
}
