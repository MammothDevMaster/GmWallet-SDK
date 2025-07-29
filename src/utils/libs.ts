const rpc = [
  "https://testnet-rpc.gmmtchain.io",
  "https://rpc-asia.gmmtchain.io",
];

export const getRPC = (chainId: number) => {
  if (chainId === 8989) {
    return rpc[1];
  } else {
    return rpc[0];
  }
};
