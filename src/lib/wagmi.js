import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID';

export const isTestnet = import.meta.env.VITE_USE_TESTNET === 'true';

const sepoliaRpc = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const mainnetRpc = import.meta.env.VITE_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';

const chains = isTestnet
  ? [baseSepolia, base]
  : [base, baseSepolia];

export const TARGET_CHAIN = chains[0];

export const wagmiConfig = getDefaultConfig({
  appName:   'Work3Labs',
  projectId,
  chains,
  transports: {
    [baseSepolia.id]: http(sepoliaRpc),
    [base.id]:        http(mainnetRpc),
  },
  ssr: false,
});

export { base, baseSepolia };
