import { SocketMessageCallback } from '../utils/types';
import { logger } from '../utils/logger';

export class SocketManager {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 2000;
  private messageCallback: SocketMessageCallback | null = null;
  private isConnected: boolean = false;

  constructor(messageCallback: SocketMessageCallback) {
    this.messageCallback = messageCallback;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.url = url;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          logger.debug('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          logger.debug('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private handleMessage(data: any): void {
    if (this.messageCallback) {
      this.messageCallback(data);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    logger.debug(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.url) {
        this.connect(this.url).catch((error) => {
          logger.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectInterval);
  }
}