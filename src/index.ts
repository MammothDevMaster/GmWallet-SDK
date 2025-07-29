export type {
  SDKOptions,
  WalletState,
  ConnectResult,
  CreateActiveResponse,
  RequestData,
  SocketMessageCallback,
  ModalStatusType,
  SDKResult
} from './utils/types';

export { WalletSDK } from './core/wallet-sdk';
export { SocketManager } from './core/socket-manager';
export { WalletModal } from './ui/wallet-modal';
export type { WalletModalOptions } from './ui/wallet-modal';
export { logger } from './utils/logger';

import { WalletSDK } from './core/wallet-sdk';
import { SDKOptions } from './utils/types';

export function createWalletSDK(options?: SDKOptions): WalletSDK {
  return new WalletSDK(options);
}

export default createWalletSDK;
