import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID';

export const isTestnet = import.meta.env.VITE_USE_TESTNET === 'true';

// Chain order: first chain is the default MetaMask will switch to
const chains = isTestnet
  ? [baseSepolia, base]          // Sepolia first
  : [base, baseSepolia];         // Mainnet first

export const TARGET_CHAIN = chains[0];

export const wagmiConfig = getDefaultConfig({
  appName:   'Apexium',
  projectId,
  chains,
  ssr:       false,
});

export { base, baseSepolia };
