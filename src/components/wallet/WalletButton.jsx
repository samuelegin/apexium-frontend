/**
 * WalletButton — saves connected wallet address to the backend on connect.
 */
import { useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';
import { isTestnet } from '@/lib/wagmi';
import { useAuth } from '@/lib/AuthContext';
import auth from '@/api/authApi';

function WalletSyncer() {
  const { address, isConnected } = useAccount();
  const { user, updateProfile }  = useAuth();
  const lastSaved = useRef(null);

  useEffect(() => {
    if (!isConnected || !address || !user) return;
    if (lastSaved.current === address) return;
    if (user.wallet_address === address) return;
    lastSaved.current = address;
    updateProfile({ wallet_address: address }).catch(() => {});
  }, [isConnected, address, user]);

  return null;
}

export default function WalletButton({ compact = false }) {
  return (
    <>
      <WalletSyncer />
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          if (!mounted) return null;

          if (!account) {
            return (
              <button
                onClick={openConnectModal}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                           bg-primary/10 border border-primary/30 text-primary
                           hover:bg-primary/20 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                {!compact && 'Connect Wallet'}
              </button>
            );
          }

          if (chain?.unsupported) {
            return (
              <button
                onClick={openChainModal}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                           bg-destructive/10 border border-destructive/30 text-destructive
                           hover:bg-destructive/20 transition-colors"
              >
                Wrong network
              </button>
            );
          }

          const accountLabel = account.ensName ?? account.displayName;

          return (
            <div className="flex flex-col gap-2 w-full">
              {!compact && (
                <button
                  onClick={openChainModal}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium
                             bg-secondary border border-border text-muted-foreground
                             hover:text-foreground transition-colors"
                >
                  {chain?.hasIcon && chain.iconUrl && (
                    <img src={chain.iconUrl} alt={chain.name} className="w-3.5 h-3.5 rounded-full" />
                  )}
                  {chain?.name}
                  {isTestnet && (
                    <span className="px-1 py-0.5 rounded text-[10px] bg-yellow-500/15 text-yellow-600 border border-yellow-500/20">
                      TESTNET
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={openAccountModal}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                           bg-card border border-border text-foreground
                           hover:bg-secondary transition-colors"
              >
                {account.ensAvatar
                  ? <img src={account.ensAvatar} alt="avatar" className="w-5 h-5 rounded-full shrink-0" />
                  : <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Wallet className="w-3 h-3 text-primary" />
                    </div>
                }
                <span className="font-mono text-xs truncate">
                  {accountLabel}
                </span>
                {!compact && account.displayBalance && (
                  <span className="text-xs text-muted-foreground shrink-0">{account.displayBalance}</span>
                )}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </>
  );
}
