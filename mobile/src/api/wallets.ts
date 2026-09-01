import { request } from './http';
import type { Wallet } from './types';

export const walletsApi = {
  list: () => request<Wallet[]>('/wallets'),
};
