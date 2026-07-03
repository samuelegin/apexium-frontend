import React, { useState } from 'react';
import { UserPlus, Users, Sparkles, AlertTriangle, Crown, X, Trash2, Search, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/api/entities';

function RemoveConfirmModal({ member, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground">Remove Member</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Are you sure you want to remove <span className="font-medium text-foreground">@{member.username}</span> from the pod?
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * PodBuilder — with real user lookup.
 *
 * Props:
 *   currentUser   — the logged-in user object (becomes Pod Admin)
 *   podName       — controlled string
 *   setPodName    — setter
 *   members       — array of ALL members INCLUDING admin: [{ username, share, verified }, ...]
 *   setMembers    — setter that receives the full updated array (including admin)
 */
export default function PodBuilder({ currentUser, podName, setPodName, members, setMembers }) {
  const [searchInput, setSearchInput]   = useState('');
  const [searchResult, setSearchResult] = useState(null); // null | 'not_found' | user object
  const [searching, setSearching]       = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const adminUsername = currentUser?.username || currentUser?.full_name || '';

  const admin   = members.find(m => m.username === adminUsername) || { username: adminUsername, email: currentUser?.email, share: 0, verified: true };
  const others  = members.filter(m => m.username !== adminUsername);
  const allMembers = [admin, ...others];

  const totalShare = allMembers.reduce((sum, m) => sum + (Number(m.share) || 0), 0);
  const shareOk    = totalShare === 100;
  const canAdd     = allMembers.length < 5;

  const updateShare = (username, value) => {
    const updated = allMembers.map(m =>
      m.username === username ? { ...m, share: Number(value) || 0 } : m
    );
    setMembers(updated);
  };

  // Look up a real user by username
  const lookupUser = async () => {
    const username = searchInput.trim().replace(/^@/, '');
    if (!username) return;
    if (username.toLowerCase() === adminUsername.toLowerCase()) {
      setSearchResult('self');
      return;
    }
    if (allMembers.some(m => m.username.toLowerCase() === username.toLowerCase())) {
      setSearchResult('already_added');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const results = await User.filter({ username });
      if (results.length > 0) {
        setSearchResult(results[0]);
      } else {
        setSearchResult('not_found');
      }
    } catch {
      setSearchResult('not_found');
    } finally {
      setSearching(false);
    }
  };

  const addMember = (userObj) => {
    setMembers([...allMembers, { username: userObj.username, email: userObj.email, share: 0, verified: true, full_name: userObj.full_name }]);
    setSearchInput('');
    setSearchResult(null);
  };

  const removeMember = (member) => {
    setMembers(allMembers.filter(m => m.username !== member.username));
    setRemoveTarget(null);
  };

  const updateWallet = (username, wallet) => {
    const updated = allMembers.map(m =>
      m.username === username ? { ...m, wallet: wallet.trim() } : m
    );
    setMembers(updated);
  };

  const autoEqualSplit = () => {
    const count = allMembers.length;
    if (count === 0) return;
    const equal     = Math.floor(100 / count);
    const remainder = 100 - equal * count;
    setMembers(allMembers.map((m, i) => ({ ...m, share: equal + (i === 0 ? remainder : 0) })));
  };

  return (
    <div className="space-y-4">
      {/* Pod Name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pod Name</label>
        <Input
          placeholder="e.g. Growth Squad"
          value={podName}
          onChange={(e) => setPodName(e.target.value)}
          className="bg-card border-border"
        />
      </div>

      {/* Members list */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Members <span className="text-muted-foreground">({allMembers.length}/5 — min 2 total)</span>
        </label>

        {/* Admin row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20 mb-2">
          <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">@{adminUsername}</span>
          <Badge className="bg-primary/20 text-primary border-0 text-xs">Admin</Badge>
          <div className="flex items-center gap-1">
            <Input
              type="number" min="0" max="100"
              value={admin.share}
              onChange={(e) => updateShare(adminUsername, e.target.value)}
              className="w-16 h-7 text-xs bg-card border-border text-center"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        {/* Admin wallet row */}
        <div className="ml-6 mb-2">
          <div className="relative">
            <Wallet className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              placeholder={`Your wallet address (0x...)`}
              value={admin.wallet || ''}
              onChange={e => updateWallet(adminUsername, e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
          {admin.wallet && !admin.wallet.match(/^0x[a-fA-F0-9]{40}$/) && (
            <p className="text-[10px] text-chart-3 mt-0.5 ml-1">Invalid wallet address format</p>
          )}
        </div>

        {/* Other members */}
        <AnimatePresence>
          {others.map((member) => (
            <React.Fragment key={member.username}>
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border mb-2"
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">@{member.username}</span>
                  {member.full_name && <span className="text-xs text-muted-foreground ml-1.5">{member.full_name}</span>}
                </div>
                {member.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" title="Verified user" />
                )}
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min="0" max="100"
                    value={member.share}
                    onChange={(e) => updateShare(member.username, e.target.value)}
                    className="w-16 h-7 text-xs bg-secondary/50 border-border text-center"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <button
                  onClick={() => setRemoveTarget(member)}
                  className="ml-1 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
              {/* Wallet address field for this member */}
              <motion.div
                key={member.username + '-wallet'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-6 mb-2"
              >
                <div className="relative">
                  <Wallet className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    placeholder={`@${member.username} wallet address (0x...)`}
                    value={member.wallet || ''}
                    onChange={e => updateWallet(member.username, e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                {member.wallet && !member.wallet.match(/^0x[a-fA-F0-9]{40}$/) && (
                  <p className="text-[10px] text-chart-3 mt-0.5 ml-1">Invalid wallet address format</p>
                )}
              </motion.div>
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>

      {/* Search + add member */}
      {canAdd && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search by @username"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSearchResult(null); }}
              onKeyDown={(e) => e.key === 'Enter' && lookupUser()}
              className="bg-card border-border"
            />
            <Button variant="outline" onClick={lookupUser} disabled={searching || !searchInput.trim()} className="gap-1.5 shrink-0">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find
            </Button>
          </div>

          {/* Search result */}
          <AnimatePresence>
            {searchResult && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {searchResult === 'not_found' && (
                  <p className="text-xs text-destructive flex items-center gap-1.5 px-1">
                    <AlertTriangle className="w-3 h-3" /> No user found with that username.
                  </p>
                )}
                {searchResult === 'self' && (
                  <p className="text-xs text-muted-foreground px-1">That's you — you're already the pod admin.</p>
                )}
                {searchResult === 'already_added' && (
                  <p className="text-xs text-muted-foreground px-1">This member is already in the pod.</p>
                )}
                {typeof searchResult === 'object' && searchResult !== null && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-sm font-medium text-foreground">@{searchResult.username}</p>
                        {searchResult.full_name && (
                          <p className="text-xs text-muted-foreground">{searchResult.full_name}</p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addMember(searchResult)} className="gap-1.5 h-7 text-xs">
                      <UserPlus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!canAdd && <p className="text-xs text-muted-foreground">Maximum of 5 members reached.</p>}

      {/* Reward split status */}
      <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        shareOk ? 'border-accent/40 bg-accent/5' : 'border-chart-3/40 bg-chart-3/5'
      }`}>
        <div>
          {shareOk
            ? <span className="text-xs font-medium text-accent">Split: 100% ✓</span>
            : <span className="text-xs text-chart-3 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Total: {totalShare}% — must equal 100%</span>
          }
        </div>
        <Button size="sm" variant="outline" onClick={autoEqualSplit} className="h-7 text-xs gap-1">
          <Sparkles className="w-3 h-3" /> Auto Equal
        </Button>
      </div>

      {/* Wallet validation summary */}
      {allMembers.some(m => !m.wallet || !m.wallet.match(/^0x[a-fA-F0-9]{40}$/)) && allMembers.length > 0 && (
        <p className="text-xs text-chart-3 flex items-center gap-1.5 px-1">
          <Wallet className="w-3 h-3" /> All members need a valid wallet address for on-chain payout.
        </p>
      )}

      {/* Remove confirmation modal */}
      <AnimatePresence>
        {removeTarget && (
          <RemoveConfirmModal
            member={removeTarget}
            onConfirm={() => removeMember(removeTarget)}
            onCancel={() => setRemoveTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
