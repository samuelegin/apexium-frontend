import { useCallback } from 'react';
import { useWalletClient, usePublicClient, useChainId, useSwitchChain, useConfig } from 'wagmi';
import { getContract, parseUnits, keccak256, toBytes } from 'viem';
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { TARGET_CHAIN } from '@/lib/wagmi';

const MAINNET_ID  = 8453;
const SEPOLIA_ID  = 84532;

const ESCROW_ADDRESS = {
  [MAINNET_ID]:  import.meta.env.VITE_ESCROW_ADDRESS_MAINNET ?? '',
  [SEPOLIA_ID]:  import.meta.env.VITE_ESCROW_ADDRESS_SEPOLIA ?? '',
};

const USDC_ADDRESS = {
  [MAINNET_ID]:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SEPOLIA_ID]:  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const ESCROW_ABI = [
  {
    name: 'fundJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',  type: 'bytes32' },
      { name: 'jobber', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'cancelJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'jobStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getJob',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'employer', type: 'address' },
          { name: 'jobber',   type: 'address' },
          { name: 'amount',   type: 'uint256' },
          { name: 'status',   type: 'uint8'   },
        ],
      },
    ],
  },
];

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

export const EscrowStatus = { EMPTY: 0, FUNDED: 1, RELEASED: 2, REFUNDED: 3 };

export function toJobId(uuid) {
  return keccak256(toBytes(uuid));
}

export function useEscrow() {
  const { data: walletClient }  = useWalletClient();
  const publicClient            = usePublicClient();
  const chainId                 = useChainId();
  const { switchChainAsync }    = useSwitchChain();
  const config                  = useConfig();

  const escrowAddress = ESCROW_ADDRESS[TARGET_CHAIN.id];
  const usdcAddress   = USDC_ADDRESS[TARGET_CHAIN.id];

  async function ensureChain() {
    if (chainId !== TARGET_CHAIN.id) {
      await switchChainAsync({ chainId: TARGET_CHAIN.id });
    }
  }

  const fundJob = useCallback(async (jobUUID, jobberAddress, amountUSD) => {
    console.log('[useEscrow] fundJob called', { jobUUID, jobberAddress, amountUSD });
    console.log('[useEscrow] escrowAddress:', escrowAddress);
    console.log('[useEscrow] usdcAddress:', usdcAddress);
    console.log('[useEscrow] walletClient:', !!walletClient);
    console.log('[useEscrow] TARGET_CHAIN:', TARGET_CHAIN);
    if (!walletClient) return { success: false, error: 'Wallet not connected' };

    try {
      console.log('[useEscrow] calling ensureChain...');
      await ensureChain();
      console.log('[useEscrow] ensureChain done');

      console.log('[useEscrow] building tx...');
      const jobIdBytes32 = toJobId(jobUUID);
      const amount       = parseUnits(String(amountUSD), 6);

      // Use wagmi/actions writeContract — routes through wagmi's transport (Alchemy)
      // instead of MetaMask's internal RPC which is rate-limited
      console.log('[useEscrow] sending approve via wagmi/actions...');
      const approveTxHash = await writeContract(config, {
        address:      usdcAddress,
        abi:          ERC20_ABI,
        functionName: 'approve',
        args:         [escrowAddress, amount],
        chainId:      TARGET_CHAIN.id,
      });
      console.log('[useEscrow] approve tx:', approveTxHash);
      await waitForTransactionReceipt(config, { hash: approveTxHash, chainId: TARGET_CHAIN.id });

      console.log('[useEscrow] sending fundJob via wagmi/actions...');
      const fundTxHash = await writeContract(config, {
        address:      escrowAddress,
        abi:          ESCROW_ABI,
        functionName: 'fundJob',
        args:         [jobIdBytes32, jobberAddress, amount],
        chainId:      TARGET_CHAIN.id,
      });
      console.log('[useEscrow] fundJob tx:', fundTxHash);
      await waitForTransactionReceipt(config, { hash: fundTxHash, chainId: TARGET_CHAIN.id });

      return { success: true, txHash: fundTxHash };
    } catch (err) {
      console.error('[useEscrow] ERROR:', err);
      const msg = err.shortMessage ?? err.message ?? 'Transaction failed';
      return { success: false, error: msg };
    }
  }, [walletClient, publicClient, chainId, escrowAddress, usdcAddress, config]);

  const cancelJob = useCallback(async (jobUUID) => {
    if (!walletClient) return { success: false, error: 'Wallet not connected' };

    try {
      await ensureChain();
      const txHash = await writeContract(config, {
        address:      escrowAddress,
        abi:          ESCROW_ABI,
        functionName: 'cancelJob',
        args:         [toJobId(jobUUID)],
        chainId:      TARGET_CHAIN.id,
      });
      await waitForTransactionReceipt(config, { hash: txHash, chainId: TARGET_CHAIN.id });

      return { success: true, txHash };
    } catch (err) {
      console.error('[useEscrow] ERROR:', err);
      const msg = err.shortMessage ?? err.message ?? 'Transaction failed';
      return { success: false, error: msg };
    }
  }, [walletClient, chainId, escrowAddress, config]);

  const getJobStatus = useCallback(async (jobUUID) => {
    try {
      const status = await publicClient.readContract({
        address:      escrowAddress,
        abi:          ESCROW_ABI,
        functionName: 'jobStatus',
        args:         [toJobId(jobUUID)],
      });
      return Number(status);
    } catch {
      return null;
    }
  }, [publicClient, escrowAddress]);

  return {
    fundJob,
    cancelJob,
    getJobStatus,
    isConnected:    !!walletClient,
    networkName:    TARGET_CHAIN.name,
    isTestnet:      TARGET_CHAIN.id === 31337 || TARGET_CHAIN.id === 84532,
  };
}
