import { request } from './http';

export const onboardingApi = {
  ensureCashrampCustomer: () =>
    request<{ customer_id?: string; status?: string }>('/onboarding/cashramp', { method: 'POST', body: '{}' }),
};
