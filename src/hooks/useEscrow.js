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

/* ── Real v3 ApexEscrow ABI — matches ApexEscrow.sol exactly ────────────────── */
const ESCROW_ABI = [
  {
    name: 'fundJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',      type: 'bytes32' },
      { name: 'amount',     type: 'uint256' },
      { name: 'recipients', type: 'address[]' },
      { name: 'shares',     type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'confirmComplete',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'raiseDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'extendDeadline',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',     type: 'bytes32' },
      { name: 'extraDays', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'setFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_feeRecipient', type: 'address' },
      { name: '_feeBps',       type: 'uint256' },
    ],
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
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'employer',        type: 'address' },
        { name: 'amount',          type: 'uint256' },
        { name: 'status',          type: 'uint8' },
        { name: 'disputed',        type: 'bool' },
        { name: 'fundedAt',        type: 'uint256' },
        { name: 'timeoutDeadline', type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getPayout',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'shares',     type: 'uint256[]' },
    ],
  },
  {
    name: 'previewFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gross', type: 'uint256' }],
    outputs: [
      { name: 'net', type: 'uint256' },
      { name: 'fee', type: 'uint256' },
    ],
  },
  {
    name: 'feeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
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

// Matches enum Status { EMPTY, FUNDED, COMPLETED, CLAIMED, REFUNDED } in ApexEscrow.sol
export const EscrowStatus = { EMPTY: 0, FUNDED: 1, COMPLETED: 2, CLAIMED: 3, REFUNDED: 4 };
export const EscrowStatusLabel = ['none', 'funded', 'completed', 'claimed', 'refunded'];

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
    await walletClient.request({ method: 'eth_requestAccounts' });
    const txHash = await walletClient.request({
      method: 'eth_sendTransaction',
      params: [{ from: address, to, data }],
    });
    return txHash;
  }

  function friendlyError(err) {
    if (err.code === 4001 || err.message?.includes('User rejected')) {
      return 'Transaction rejected by user';
    }
    return err.shortMessage ?? err.message ?? 'Transaction failed';
  }

  /**
   * fundJob — approve USDC then lock the payout split on-chain.
   * `recipients`/`shares` are FINAL the moment this confirms — the contract
   * has no way to change them later, so callers must only invoke this once
   * the split is fully agreed (solo: 1 recipient @ 100; pod: all approved).
   *
   * onStep(stepKey, status) is called for a progress modal to render live:
   *   stepKey: 'approve' | 'fund'
   *   status:  'pending' | 'confirming' | 'done' | 'error'
   */
  const fundJob = useCallback(async (jobUUID, amountUSD, recipients, shares, onStep = () => {}) => {
    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!address)       return { success: false, error: 'No account found' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };
    if (!usdcAddress)   return { success: false, error: 'USDC address missing for this chain' };
    if (!recipients?.length || recipients.length !== shares?.length) {
      return { success: false, error: 'recipients and shares must be the same non-empty length' };
    }
    const totalShare = shares.reduce((s, v) => s + Number(v), 0);
    if (totalShare !== 100) {
      return { success: false, error: `shares must sum to 100 (got ${totalShare})` };
    }

    try {
      await ensureChain();

      const jobIdBytes32 = toJobId(jobUUID);
      const amount       = parseUnits(String(amountUSD), 6);

      // ── Tx 1: USDC approve ────────────────────────────────────────────────
      onStep('approve', 'pending');
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, amount],
      });
      const approveTxHash = await sendRawTx(usdcAddress, approveData);
      onStep('approve', 'confirming');
      await waitForTransactionReceipt(config, { hash: approveTxHash, chainId: TARGET_CHAIN.id });
      onStep('approve', 'done');

      // ── Tx 2: fundJob ─────────────────────────────────────────────────────
      onStep('fund', 'pending');
      const fundData = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'fundJob',
        args: [jobIdBytes32, amount, recipients, shares.map(s => BigInt(s))],
      });
      const fundTxHash = await sendRawTx(escrowAddress, fundData);
      onStep('fund', 'confirming');
      await waitForTransactionReceipt(config, { hash: fundTxHash, chainId: TARGET_CHAIN.id });
      onStep('fund', 'done');

      return { success: true, txHash: fundTxHash, approveTxHash };
    } catch (err) {
      onStep('error', 'error');
      return { success: false, error: friendlyError(err) };
    }
  }, [walletClient, address, chainId, escrowAddress, usdcAddress, config]);

  const confirmComplete = useCallback(async (jobUUID, onStep = () => {}) => {
    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };
    try {
      await ensureChain();
      onStep('complete', 'pending');
      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'confirmComplete',
        args: [toJobId(jobUUID)],
      });
      const txHash = await sendRawTx(escrowAddress, data);
      onStep('complete', 'confirming');
      await waitForTransactionReceipt(config, { hash: txHash, chainId: TARGET_CHAIN.id });
      onStep('complete', 'done');
      return { success: true, txHash };
    } catch (err) {
      onStep('error', 'error');
      return { success: false, error: friendlyError(err) };
    }
  }, [walletClient, address, chainId, escrowAddress, config]);

  const claim = useCallback(async (jobUUID, onStep = () => {}) => {
    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };
    try {
      await ensureChain();
      onStep('claim', 'pending');
      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'claim',
        args: [toJobId(jobUUID)],
      });
      const txHash = await sendRawTx(escrowAddress, data);
      onStep('claim', 'confirming');
      await waitForTransactionReceipt(config, { hash: txHash, chainId: TARGET_CHAIN.id });
      onStep('claim', 'done');
      return { success: true, txHash };
    } catch (err) {
      onStep('error', 'error');
      return { success: false, error: friendlyError(err) };
    }
  }, [walletClient, address, chainId, escrowAddress, config]);

  const raiseDispute = useCallback(async (jobUUID) => {
    if (!walletClient)  return { success: false, error: 'Wallet not connected' };
    if (!escrowAddress) return { success: false, error: 'Escrow contract not configured' };
    try {
      await ensureChain();
      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: 'raiseDispute',
        args: [toJobId(jobUUID)],
      });
      const txHash = await sendRawTx(escrowAddress, data);
      await waitForTransactionReceipt(config, { hash: txHash, chainId: TARGET_CHAIN.id });
      return { success: true, txHash };
    } catch (err) {
      return { success: false, error: friendlyError(err) };
    }
  }, [walletClient, address, chainId, escrowAddress, config]);

  const getJobStatus = useCallback(async (jobUUID) => {
    try {
      const status = await publicClient.readContract({
        address: escrowAddress, abi: ESCROW_ABI, functionName: 'jobStatus', args: [toJobId(jobUUID)],
      });
      return Number(status);
    } catch { return null; }
  }, [publicClient, escrowAddress]);

  const getJob = useCallback(async (jobUUID) => {
    try {
      const job = await publicClient.readContract({
        address: escrowAddress, abi: ESCROW_ABI, functionName: 'getJob', args: [toJobId(jobUUID)],
      });
      return {
        employer: job.employer,
        amount: job.amount,
        status: Number(job.status),
        disputed: job.disputed,
        fundedAt: Number(job.fundedAt),
        timeoutDeadline: Number(job.timeoutDeadline),
      };
    } catch { return null; }
  }, [publicClient, escrowAddress]);

  return {
    fundJob,
    confirmComplete,
    claim,
    raiseDispute,
    getJobStatus,
    getJob,
    isConnected: !!walletClient,
    connectedAddress: address,
    networkName: TARGET_CHAIN.name,
    isTestnet:   TARGET_CHAIN.id === 31337 || TARGET_CHAIN.id === 84532,
  };
}
