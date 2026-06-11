import { useCallback } from 'react';
import { useWalletClient, usePublicClient, useChainId, useSwitchChain, useAccount } from 'wagmi';
import { parseUnits, keccak256, toBytes, encodeFunctionData } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useConfig } from 'wagmi';
import { TARGET_CHAIN } from '@/lib/wagmi';

const MAINNET_ID = 8453;
const SEPOLIA_ID = 84532;

const ESCROW_ADDRESS = {
  [MAINNET_ID]: import.meta.env.VITE_ESCROW_ADDRESS_MAINNET ?? '',
  [SEPOLIA_ID]: import.meta.env.VITE_ESCROW_ADDRESS_SEPOLIA ?? '',
};

const USDC_ADDRESS = {
  [MAINNET_ID]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SEPOLIA_ID]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
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
];

export const EscrowStatus = { EMPTY: 0, FUNDED: 1, RELEASED: 2, REFUNDED: 3 };

export function toJobId(uuid) {
  return keccak256(toBytes(uuid));
}

export function useEscrow() {
  const { data: walletClient } = useWalletClient();
  const publicClient           = usePublicClient();
  const { address }            = useAccount();
  const chainId                = useChainId();
  const { switchChainAsync }   = useSwitchChain();
  const config                 = useConfig();

  const escrowAddress = ESCROW_ADDRESS[TARGET_CHAIN.id];
  const usdcAddress   = USDC_ADDRESS[TARGET_CHAIN.id];

  async function ensureChain() {
    if (chainId !== TARGET_CHAIN.id) {
      await switchChainAsync({ chainId: TARGET_CHAIN.id });
    }
  }

  /**
   * Sends raw calldata via eth_sendTransaction — bypasses viem/wagmi's
   * internal simulation step that hits MetaMask's own RPC and causes -32002.
   * MetaMask receives the raw tx and shows the popup directly.
   */
  async function sendRawTx(to, data) {
    // eth_requestAccounts first to ensure MetaMask is unlocked
    await walletClient.request({ method: 'eth_requestAccounts' });

    const txHash = await walletClient.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  address,
        to,
        data,
        // No gas — MetaMask will estimate it itself, avoiding our RPC call too
      }],
    });

    return txHash;
  }

  const fundJob = useCallback(async (jobUUID, jobberAddress, amountUSD) => {
    console.log('[useEscrow] fundJob called', { jobUUID, jobberAddress, amountUSD });
    console.log('[useEscrow] escrowAddress:', escrowAddress);
    console.log('[useEscrow] usdcAddress:', usdcAddress);
    console.log('[useEscrow] walletClient:', !!walletClient);
    console.log('[useEscrow] address:', address);

    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!address)       return { success: false, error: 'No account found' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };
    if (!usdcAddress)   return { success: false, error: 'USDC address missing for this chain' };

    try {
      await ensureChain();

      const jobIdBytes32 = toJobId(jobUUID);
      const amount       = parseUnits(String(amountUSD), 6);

      // ── Tx 1: USDC approve ────────────────────────────────────────────────
      // Raw eth_sendTransaction → MetaMask popup fires immediately
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, amount],
      });

      console.log('[useEscrow] sending approve — MetaMask popup should fire now');
      const approveTxHash = await sendRawTx(usdcAddress, approveData);
      console.log('[useEscrow] approve tx:', approveTxHash);

      await waitForTransactionReceipt(config, { hash: approveTxHash, chainId: TARGET_CHAIN.id });
      console.log('[useEscrow] approve confirmed');

      // ── Tx 2: fundJob ─────────────────────────────────────────────────────
      const fundData = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'fundJob',
        args: [jobIdBytes32, jobberAddress, amount],
      });

      console.log('[useEscrow] sending fundJob — second MetaMask popup');
      const fundTxHash = await sendRawTx(escrowAddress, fundData);
      console.log('[useEscrow] fundJob tx:', fundTxHash);

      await waitForTransactionReceipt(config, { hash: fundTxHash, chainId: TARGET_CHAIN.id });
      console.log('[useEscrow] fundJob confirmed');

      return { success: true, txHash: fundTxHash };
    } catch (err) {
      console.error('[useEscrow] ERROR:', err);
      // User rejected = 4001
      if (err.code === 4001 || err.message?.includes('User rejected')) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      const msg = err.shortMessage ?? err.message ?? 'Transaction failed';
      return { success: false, error: msg };
    }
  }, [walletClient, publicClient, address, chainId, escrowAddress, usdcAddress, config]);

  const cancelJob = useCallback(async (jobUUID) => {
    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!address)       return { success: false, error: 'No account found' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };

    try {
      await ensureChain();

      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'cancelJob',
        args: [toJobId(jobUUID)],
      });

      const txHash = await sendRawTx(escrowAddress, data);
      await waitForTransactionReceipt(config, { hash: txHash, chainId: TARGET_CHAIN.id });

      return { success: true, txHash };
    } catch (err) {
      console.error('[useEscrow] ERROR:', err);
      const msg = err.shortMessage ?? err.message ?? 'Transaction failed';
      return { success: false, error: msg };
    }
  }, [walletClient, address, chainId, escrowAddress, config]);

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
    isConnected: !!walletClient,
    networkName: TARGET_CHAIN.name,
    isTestnet:   TARGET_CHAIN.id === 31337 || TARGET_CHAIN.id === 84532,
  };
}
