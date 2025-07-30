export interface SDKOptions {
  name?: string;
  url?: string;
  icons?: string;
  isMainnet?: boolean;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: 8989 | 898989;
  isConnecting: boolean;
  status: boolean | null;
  error: string | null;
  tx: string | null;
  signHash: string | null;
}

export interface ConnectResult {
  url: string;
  gmWalletUrl: string;
}

export interface CreateActiveResponse {
  code: string;
  message: string;
  error: string | null;
  data: {
    ref: string;
    method: string;
    chain_id: number;
  };
}

export interface RequestData {
  method: string;
  chain_id: number;
  account?: string;
  payload: Record<string, any>;
}

export interface SDKResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SocketMessageCallback = (data: any) => void;
export type ModalStatusType = "loading" | "success" | "error" | "connecting";

export interface PayloadType {
  status: boolean;
  message: string;
  data: string;
}

export interface PendingRequest {
  resolve: (value: SDKResult<any>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  method: string;
}

export type RequestMethod = "eth_sendTransaction" | "personal_sign" | "eth_signTypedDataV4" | "connect";
