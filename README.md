# GMWallet SDK

A simple and lightweight SDK for integrating GMWallet into your web applications.

## Installation

### From npm registry (Recommended)
```bash
npm install @mammothdevmaster/gmwallet-sdk
```

### From GitHub Packages
First, configure npm to use GitHub Packages for the `@mammothdevmaster` scope:

```bash
# Create or update .npmrc file
echo "@mammothdevmaster:registry=https://npm.pkg.github.com" >> .npmrc
```

Then install the package:
```bash
npm install @mammothdevmaster/gmwallet-sdk
```

## Quick Start

```javascript
import { createWalletSDK } from "@mammothdevmaster/gmwallet-sdk";

// Initialize SDK
const sdk = createWalletSDK({
  name: "My DApp",
  url: "https://mydapp.com",
  icons: "https://mydapp.com/icon.png",
  isMainnet: true,
  throwOnError: false, 
});

// Connect wallet
const result = await sdk.connect();
if (result.success) {
  console.log("Connected:", result.data);
} else {
  console.error("Connection failed:", result.error);
}
```

## API Reference

### createWalletSDK(options?)

Creates a new WalletSDK instance.

**Parameters:**

- `options` (SDKOptions, optional): Configuration options

**Returns:** WalletSDK instance

### WalletSDK Methods

#### `connect(modalOptions?)`

Initiates wallet connection with modal UI.

**Parameters:**

- `modalOptions` (WalletModalOptions, optional): Modal customization options
  - `subTitleText?: string` - Custom subtitle text
  - `connectImgUrl?: string` - Custom connection image URL

**Returns:** `Promise<SDKResult<ConnectResult>>`

- `success: boolean` - Operation success status
- `data?: ConnectResult` - Connection result (if successful)
  - `url: string` - WebSocket URL
  - `gmWalletUrl: string` - Deep link URL
- `error?: string` - Error message (if failed)

**Example:**

```javascript
const result = await sdk.connect({
  subTitleText: "Connect to access your NFTs",
});

if (result.success) {
  console.log("Connection URLs:", result.data);
} else {
  console.error("Failed to connect:", result.error);
}
```

#### `disconnect()`

Disconnects from wallet and closes modal.

**Returns:** `Promise<void>`

**Example:**

```javascript
await sdk.disconnect();
```

#### `getState()`

Returns current wallet state.

**Returns:** `WalletState`

- `isConnected: boolean` - Connection status
- `address: string | null` - Wallet address
- `chainId: 8989 | 898989` - Current chain ID
- `isConnecting: boolean` - Connection in progress
- `error: string | null` - Last error message

**Example:**

```javascript
const state = sdk.getState();
if (state.isConnected) {
  console.log("Address:", state.address);
}
```

#### `eth_sendTransaction(from, to, value, rawData?)`

Sends a transaction through GMWallet.

**Parameters:**

- `from: string` - Sender address
- `to: string` - Recipient address
- `value: string` - Transaction value (in wei)
- `rawData?: string` - Contract call data (optional)

**Returns:** `Promise<SDKResult<ConnectResult>>`

**Example:**

```javascript
const txResult = await sdk.eth_sendTransaction(
  "0x...", // from
  "0x...", // to
  "1", // 1 ETH
  "0x" // raw data
);

if (txResult.success) {
  console.log("Transaction initiated:", txResult.data);
} else {
  console.error("Transaction failed:", txResult.error);
}
```

## Types

### SDKOptions

```typescript
interface SDKOptions {
  name?: string; // DApp name
  url?: string; // DApp URL
  icons?: string; // DApp icon URL
  isMainnet?: boolean; // Network selection (true: 8989, false: 898989)
  throwOnError?: boolean; // Legacy error handling (default: false)
}
```

### WalletState

```typescript
interface WalletState {
  isConnected: boolean; // Connection status
  address: string | null; // Wallet address
  chainId: 8989 | 898989; // Current chain ID
  isConnecting: boolean; // Connection in progress
  error: string | null; // Last error message
}
```

### SDKResult

```typescript
interface SDKResult<T = any> {
  success: boolean; // Operation success status
  data?: T; // Result data (if successful)
  error?: string; // Error message (if failed)
}
```

### ConnectResult

```typescript
interface ConnectResult {
  url: string; // WebSocket URL for connection
  gmWalletUrl: string; // Deep link URL for mobile
}
```

## Browser Support

- Chrome/Chromium browsers
- Safari (iOS/macOS)
- Edge
- Firefox

## Requirements

- Modern browser with WebSocket support
- ES2018+ support
- TypeScript 4.0+ (for TypeScript projects)

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 MammothLabs
