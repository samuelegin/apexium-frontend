import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID';

export const isTestnet = import.meta.env.VITE_USE_TESTNET === 'true';

// Use env RPC if set, otherwise fall back to multiple public endpoints
const sepoliaRpc = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;
const mainnetRpc = import.meta.env.VITE_BASE_MAINNET_RPC_URL;

const sepoliaTransport = sepoliaRpc
  ? http(sepoliaRpc)
  : fallback([
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
      http('https://sepolia.base.org'),
    ]);

const mainnetTransport = mainnetRpc
  ? http(mainnetRpc)
  : fallback([
      http('https://base-rpc.publicnode.com'),
      http('https://base.blockpi.network/v1/rpc/public'),
      http('https://mainnet.base.org'),
    ]);

const chains = isTestnet
  ? [baseSepolia, base]
  : [base, baseSepolia];

export const TARGET_CHAIN = chains[0];

export const wagmiConfig = getDefaultConfig({
  appName:   'Work3Labs',
  projectId,
  chains,
  transports: {
    [baseSepolia.id]: sepoliaTransport,
    [base.id]:        mainnetTransport,
  },
  ssr: false,
});

export { base, baseSepolia };
