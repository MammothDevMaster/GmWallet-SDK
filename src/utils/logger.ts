
// @ts-ignore
const DEBUG = __DEV__;

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.log(`[GMWallet SDK]`, message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[GMWallet SDK Error]`, message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[GMWallet SDK Warning]`, message, ...args);
  },
  info: (message: string, ...args: any[]) => {
    if (DEBUG) {
      console.info(`[GMWallet SDK Info]`, message, ...args);
    }
  }
};