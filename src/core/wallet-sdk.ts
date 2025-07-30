import { ethers } from "ethers";
import { WalletModal, WalletModalOptions } from "../ui/wallet-modal";
import { getRPC } from "../utils/libs";
import { logger } from "../utils/logger";
import {
  ConnectResult,
  CreateActiveResponse,
  PayloadType,
  PendingRequest,
  RequestData,
  RequestMethod,
  SDKOptions,
  SDKResult,
  WalletState,
} from "../utils/types";
import { SocketManager } from "./socket-manager";

enum Link {
  SERVER_URL = "https://bridge.gmwallet.life",
  SOCKET_URL = "wss://bridge.gmwallet.life",
  AOS_DEEP_LINK = "gmwallet://wallet.mammothlabs.io/splash?topic=",
  IOS_DEEP_LINK = "gmwallet://splash?topic=",
}

export class WalletSDK {
  private state: WalletState;
  private socketManager: SocketManager;
  private modal: WalletModal;
  private currentSocketUrl: string = "";
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter: number = 0;
  private currentConnectRequest: string | null = null;
  private currentTransactionRequest: string | null = null;
  private currentSignRequest: string | null = null;

  constructor(options: SDKOptions = {}) {
    this.state = {
      isConnected: false,
      address: null,
      chainId: options.isMainnet ? 8989 : 898989,
      isConnecting: false,
      error: null,
      status: null,
      tx: null,
      signHash: null,
    };

    this.modal = new WalletModal();
    this.socketManager = new SocketManager(this.handleSocketMessage.bind(this));

    this.initializeOptions(options);
  }

  private initializeOptions(options: SDKOptions): void {
    (this.state as any).name = options.name || null;
    (this.state as any).url = options.url || null;
    (this.state as any).icons = options.icons || null;
  }

  private createPendingRequest<T>(method: RequestMethod, timeoutMs: number = 300000): { requestId: string; promise: Promise<SDKResult<T>> } {
    const requestId = `${method}_${++this.requestCounter}_${Date.now()}`;
    
    const promise = new Promise<SDKResult<T>>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({ success: false, error: `${method} request timed out after ${timeoutMs}ms` });
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve,
        reject: (error: Error) => resolve({ success: false, error: error.message }),
        timeout,
        method
      });
    });

    return { requestId, promise };
  }

  private resolvePendingRequest(requestId: string, result: SDKResult<any>): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.resolve(result);
    }
  }

  private rejectPendingRequest(requestId: string, error: Error): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.reject(error);
    }
  }

  private rejectAllPendingRequests(error: Error): void {
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.resolve({ success: false, error: error.message });
    }
    this.pendingRequests.clear();
  }

  async connect(
    modalOptions: WalletModalOptions = {}
  ): Promise<SDKResult<ConnectResult>> {
    try {
      this.rejectAllPendingRequests(new Error("New connection attempt started"));

      this.updateState({
        isConnecting: true,
        error: null,
        tx: null,
        status: null,
        signHash: null,
      });

      const requestData: RequestData = {
        method: "connect",
        chain_id: this.state.chainId,
        payload: {
          logoImageUrl: (this.state as any).icons || "",
          siteName: (this.state as any).name || "",
          siteUrl: (this.state as any).url || "",
        },
      };

      const result = await this.requestActive(requestData);

      if (!modalOptions.subTitleText)
        modalOptions.subTitleText = "Connect GM Wallet";

      if (result.url && result.gmWalletUrl) {
        this.currentSocketUrl = result.url;

        const { requestId, promise } = this.createPendingRequest<ConnectResult>("connect");
        this.currentConnectRequest = requestId;

        this.modal.show(
          result.gmWalletUrl,
          modalOptions,
          () => this.refreshConnection(requestData),
          () => {
            this.rejectPendingRequest(requestId, new Error("Connection cancelled by user"));
            this.currentConnectRequest = null;
            this.handleModalClose();
          }
        );

        await this.socketManager.connect(result.url);

        return await promise;
      } else {
        const errorMessage = "Failed to get connection URLs";
        this.updateState({
          isConnecting: false,
          error: errorMessage,
          status: false,
        });
        this.modal.updateStatus(errorMessage, "error");

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      this.rejectAllPendingRequests(error instanceof Error ? error : new Error("Connection failed"));
      
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
        status: false,
      });
      this.modal.updateStatus(errorMessage, "error");

      return { success: false, error: errorMessage };
    }
  }


  async disconnect(): Promise<void> {
    this.socketManager.disconnect();
    this.modal.hide();
    this.updateState({
      isConnected: false,
      address: null,
      isConnecting: false,
      error: null,
      status: null,
      tx: null,
      signHash: null,
    });
  }

  getState(): WalletState {
    return this.state;
  }

  async eth_sendTransaction(
    from: string,
    to: string,
    value: string,
    rawData: string = "",
    modalOptions: WalletModalOptions = {}
  ): Promise<SDKResult<ConnectResult>> {
    try {
      this.updateState({
        isConnecting: true,
        error: null,
        tx: null,
        status: null,
        signHash: null,
      });

      const requestData: RequestData = {
        method: "eth_sendTransaction",
        chain_id: this.state.chainId,
        account: from,
        payload: {
          from,
          to,
          value,
          rawData,
          logoImageUrl: (this.state as any).icons || "",
          siteName: (this.state as any).name || "",
          siteUrl: (this.state as any).url || "",
        },
      };

      const result = await this.requestActive(requestData);

      if (!modalOptions.subTitleText)
        modalOptions.subTitleText = "Sign transaction in GM Wallet";

      if (result.url && result.gmWalletUrl) {
        this.currentSocketUrl = result.url;

        const { requestId, promise } = this.createPendingRequest<ConnectResult>("eth_sendTransaction");
        this.currentTransactionRequest = requestId;

        this.modal.show(
          result.gmWalletUrl,
          modalOptions,
          () => this.refreshConnection(requestData),
          () => {
            this.rejectPendingRequest(requestId, new Error("Transaction cancelled by user"));
            this.currentTransactionRequest = null;
            this.handleModalClose();
          }
        );

        await this.socketManager.connect(result.url);
        
        // Wait for the actual transaction completion
        return await promise;
      } else {
        const errorMessage = "Failed to get transaction URLs";
        this.updateState({
          isConnecting: false,
          error: errorMessage,
          status: false,
        });
        this.modal.updateStatus(errorMessage, "error");

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      this.updateState({
        isConnecting: false,
        error: errorMessage,
        status: false,
      });
      this.modal.updateStatus(errorMessage, "error");

      return { success: false, error: errorMessage };
    }
  }

  async personal_sign(
    account: string,
    message: string,
    signType?: string,
    modalOptions: WalletModalOptions = {}
  ): Promise<SDKResult<ConnectResult>> {
    try {
      this.updateState({
        isConnecting: true,
        error: null,
        tx: null,
        status: null,
        signHash: null,
      });

      const requestData: RequestData = {
        method: "personal_sign",
        chain_id: this.state.chainId,
        account: account,
        payload: {
          message,
          signType: signType ?? "Sign Message",
          logoImageUrl: (this.state as any).icons || "",
          siteName: (this.state as any).name || "",
          siteUrl: (this.state as any).url || "",
        },
      };

      const result = await this.requestActive(requestData);
      if (!modalOptions.subTitleText)
        modalOptions.subTitleText = "Personal Sign in GM Wallet";

      if (result.url && result.gmWalletUrl) {
        this.currentSocketUrl = result.url;

        this.modal.show(
          result.gmWalletUrl,
          modalOptions,
          () => this.refreshConnection(requestData),
          () => this.handleModalClose()
        );

        await this.socketManager.connect(result.url);
        return { success: true, data: result };
      } else {
        const errorMessage = "Failed to get personal sign URLs";
        this.updateState({
          isConnecting: false,
          error: errorMessage,
          status: false,
        });
        this.modal.updateStatus(errorMessage, "error");

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "PersonalSign failed";
      this.updateState({
        isConnecting: false,
        error: errorMessage,
        status: false,
      });
      this.modal.updateStatus(errorMessage, "error");

      return { success: false, error: errorMessage };
    }
  }

  async eth_signTypedDataV4(
    account: string,
    typeData: {},
    modalOptions: WalletModalOptions = {}
  ): Promise<SDKResult<ConnectResult>> {
    try {
      this.updateState({
        isConnecting: true,
        error: null,
        tx: null,
        status: null,
        signHash: null,
      });

      const requestData: RequestData = {
        method: "eth_signTypedDataV4",
        chain_id: this.state.chainId,
        account: account,
        payload: {
          typeData,
          logoImageUrl: (this.state as any).icons || "",
          siteName: (this.state as any).name || "",
          siteUrl: (this.state as any).url || "",
        },
      };

      const result = await this.requestActive(requestData);
      if (!modalOptions.subTitleText)
        modalOptions.subTitleText = "SignTypedDataV4 in GM Wallet";
      if (result.url && result.gmWalletUrl) {
        this.currentSocketUrl = result.url;

        this.modal.show(
          result.gmWalletUrl,
          modalOptions,
          () => this.refreshConnection(requestData),
          () => this.handleModalClose()
        );

        await this.socketManager.connect(result.url);
        return { success: true, data: result };
      } else {
        const errorMessage = "Failed to get signTypedDataV4 URLs";
        this.updateState({
          isConnecting: false,
          error: errorMessage,
          status: false,
        });
        this.modal.updateStatus(errorMessage, "error");

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "signTypedDataV4 failed";
      this.updateState({
        isConnecting: false,
        error: errorMessage,
        status: false,
      });
      this.modal.updateStatus(errorMessage, "error");

      return { success: false, error: errorMessage };
    }
  }

  private async requestActive(
    requestData: RequestData
  ): Promise<ConnectResult> {
    try {
      const deviceInfo = this.getDeviceInfo();
      const response = await fetch(`${Link.SERVER_URL}/api/v1/active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result: CreateActiveResponse = await response.json();

      if (!result.data) {
        throw new Error("Failed to create active session");
      }

      const gmWalletUrl = this.createDeepLink(
        deviceInfo.platform,
        result.data.method,
        result.data.ref,
        result.data.chain_id,
        requestData.account || ""
      );

      return {
        url: `${Link.SOCKET_URL}/ws/client/${result.data.ref}`,
        gmWalletUrl,
      };
    } catch (error) {
      logger.error("Error in requestActive:", error);
      throw error;
    }
  }

  private createDeepLink(
    platform: string | null,
    method: string,
    ref: string,
    chainId: number,
    account: string = ""
  ): string {
    const base = platform === "ios" ? Link.IOS_DEEP_LINK : Link.AOS_DEEP_LINK;
    const data = {
      method: method,
      ref,
      chainId,
      account,
    };
    return `${base}${JSON.stringify(data)}`;
  }

  private getDeviceInfo() {
    let userInfo = "";
    if (typeof window !== "undefined" && window.navigator?.userAgent) {
      userInfo = window.navigator.userAgent.toLowerCase();
    }

    return {
      browser: userInfo.includes("chrome") ? "chrome" : null,
      platform: userInfo.includes("android")
        ? "android"
        : userInfo.includes("iphone") || userInfo.includes("ipad")
        ? "ios"
        : userInfo.includes("win") || userInfo.includes("mac")
        ? "web"
        : null,
      isApp:
        userInfo.includes("android") ||
        userInfo.includes("iphone") ||
        userInfo.includes("ipad"),
    };
  }

  private async handleSocketMessage(data: any): Promise<void> {
    try {
      logger.debug("Socket message received:", data);
      if (data?.method === "connected") {
        logger.debug("GM Wallet connected");
        this.modal.updateStatus(
          "Proceed with authentication in your wallet to use GM Wallet",
          "connecting"
        );
      } else if (data?.method === "res") {
        try {
          const payload = data?.payload;
          if (!payload?.status) {
            const errorMessage = payload?.message || "Connection failed";
            this.updateState({
              isConnecting: false,
              error: errorMessage,
              status: false,
            });
            this.modal.updateStatus(errorMessage, "error");
            
            if (this.currentConnectRequest) {
              this.rejectPendingRequest(this.currentConnectRequest, new Error(errorMessage));
              this.currentConnectRequest = null;
            }
          } else if (payload?.status) {
            const address = payload?.data?.toLowerCase();
            this.updateState({
              isConnected: true,
              address: address,
              isConnecting: false,
              error: null,
              status: true,
            });
            this.modal.updateStatus("Connected successfully!", "success");
            
            if (this.currentConnectRequest) {
              this.resolvePendingRequest(this.currentConnectRequest, {
                success: true,
                data: { url: this.currentSocketUrl, gmWalletUrl: "", address }
              });
              this.currentConnectRequest = null;
            }
          }
          this.socketManager.disconnect();
        } catch (err) {
          logger.error("Failed to parse response data:", err);
          this.modal.updateStatus("Failed to parse response", "error");
          
          if (this.currentConnectRequest) {
            this.rejectPendingRequest(this.currentConnectRequest, new Error("Failed to parse response"));
            this.currentConnectRequest = null;
          }
        }
      } else if (data?.method === "eth_sendTransaction") {
        console.debug("Handling eth_sendTransaction response");
        try {
          let payload = data?.payload;
          if (payload.status) {
            payload = await this.checkTransaction(
              data.payload,
              this.state.chainId
            );
          }
          const tx = payload.data;

          if (!payload?.status) {
            const errorMessage = payload?.message || "Transaction failed";
            this.updateState({
              isConnecting: false,
              tx: tx,
              error: errorMessage,
              status: false,
            });
            this.modal.updateStatus(errorMessage, "error");
            
            if (this.currentTransactionRequest) {
              this.rejectPendingRequest(this.currentTransactionRequest, new Error(errorMessage));
              this.currentTransactionRequest = null;
            }
          } else if (payload?.status) {
            logger.debug("Transaction hash:", tx);
            this.updateState({
              isConnecting: false,
              error: null,
              tx: tx,
              status: true,
            });
            logger.debug("Transaction completed successfully2:", tx);
            this.modal.updateStatus(
              "Transaction completed successfully!",
              "success"
            );
            
            if (this.currentTransactionRequest) {
              this.resolvePendingRequest(this.currentTransactionRequest, {
                success: true,
                data: { url: this.currentSocketUrl, gmWalletUrl: "", tx }
              });
              this.currentTransactionRequest = null;  
            }
          }
          this.socketManager.disconnect();
        } catch (err) {
          logger.error("Failed to parse transaction data:", err);
          this.modal.updateStatus(
            "Failed to parse transaction response",
            "error"
          );
          
          // Reject transaction request if pending
          if (this.currentTransactionRequest) {
            this.rejectPendingRequest(this.currentTransactionRequest, new Error("Failed to parse transaction response"));
            this.currentTransactionRequest = null;
          }
        }
      } else if (data?.method === "personal_sign") {
        try {
          let payload = data?.payload;

          if (!payload?.status) {
            this.updateState({
              isConnecting: false,
              error: payload?.message || "PersonalSign failed",
              status: false,
            });
            this.modal.updateStatus(
              payload?.message || "PersonalSign failed",
              "error"
            );
          } else if (payload?.status) {
            const signHash = payload?.data;
            logger.debug("PersonalSign hash:", signHash);
            this.updateState({
              isConnecting: false,
              error: null,
              signHash: signHash,
              status: true,
            });
            this.modal.updateStatus(
              "PersonalSign completed successfully!",
              "success"
            );
          }
          this.socketManager.disconnect();
        } catch (err) {
          logger.error("Failed to parse personal sign data:", err);
          this.modal.updateStatus(
            "Failed to parse personal sign response",
            "error"
          );
        }
      } else if (data?.method === "eth_signTypedDataV4") {
        try {
          let payload = data?.payload;
          if (!payload?.status) {
            this.updateState({
              isConnecting: false,
              error: payload?.message || "SignTypedDataV4 failed",
              status: false,
            });
            this.modal.updateStatus(
              payload?.message || "SignTypedDataV4 failed",
              "error"
            );
          } else if (payload?.status) {
            const signHash = payload?.data;
            logger.debug("SignTypedDataV4 hash:", signHash);
            this.updateState({
              isConnecting: false,
              error: null,
              signHash: signHash,
              status: true,
            });
            this.modal.updateStatus(
              "SignTypedDataV4 completed successfully!",
              "success"
            );
          }
          this.socketManager.disconnect();
        } catch (error) {
          logger.error("Failed to parse signTypedDataV4 data:", error);
          this.modal.updateStatus(
            "Failed to parse signTypedDataV4 response",
            "error"
          );
        }
      }
    } catch (error) {
      logger.error("Error handling socket message:", error);
      this.modal.updateStatus("Connection error", "error");
    }
  }

  private async refreshConnection(requestData: RequestData): Promise<string> {
    try {
      this.socketManager.disconnect();

      const result = await this.requestActive(requestData);

      if (result.url && result.gmWalletUrl) {
        this.currentSocketUrl = result.url;
        await this.socketManager.connect(result.url);
        return result.gmWalletUrl;
      }

      return "";
    } catch (error) {
      logger.error("Failed to refresh connection:", error);
      return "";
    }
  }

  private handleModalClose(): void {
    this.socketManager.disconnect();
    this.updateState({
      isConnecting: false,
      error: null,
      status: null,
      tx: null,
      signHash: null,
    });
  }

  private updateState(updates: Partial<WalletState>): void {
    Object.assign(this.state, updates);
  }

  private async checkTransaction(
    data: PayloadType,
    chainId: number
  ): Promise<PayloadType> {
    const result: PayloadType = { ...data };
    const rpc = getRPC(chainId);
    const provider = new ethers.providers.JsonRpcProvider(rpc);

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const receipt = await provider.getTransactionReceipt(data.data);
          if (receipt) {
            clearInterval(interval);
            if (receipt.status === 1) {
              resolve(result);
            } else {
              result.status = false;
              result.message = "Failed";
              resolve(result);
            }
          }
        } catch (err) {
          clearInterval(interval);
          result.status = false;
          result.message = "Failed";
          logger.error("Receipt check error:", err);
          resolve(result);
        }
      }, 5000);
    });
  }
}
