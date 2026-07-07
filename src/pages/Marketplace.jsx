import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '@/lib/ModeContext';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import JobCard from '@/components/shared/JobCard';
import { Job } from '@/api/entities';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { value: 'all',         label: 'All' },
  { value: 'development', label: 'Development' },
  { value: 'design',      label: 'Design' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'content',     label: 'Content' },
  { value: 'sales',       label: 'Sales' },
  { value: 'community',   label: 'Community' },
  { value: 'analytics',   label: 'Analytics' },
  { value: 'operations',  label: 'Operations' },
  { value: 'other',       label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'pay_high', label: 'Highest pay' },
  { value: 'pay_low',  label: 'Lowest pay' },
  { value: 'deadline', label: 'Deadline soonest' },
];

const PAY_RANGES = [
  { value: 'all',     label: 'Any pay' },
  { value: '0_100',   label: 'Under $100' },
  { value: '100_500', label: '$100 – $500' },
  { value: '500_1k',  label: '$500 – $1,000' },
  { value: '1k_plus', label: '$1,000+' },
];

function inPayRange(amount, range) {
  const v = Number(amount) || 0;
  if (range === 'all')     return true;
  if (range === '0_100')   return v < 100;
  if (range === '100_500') return v >= 100 && v < 500;
  if (range === '500_1k')  return v >= 500 && v < 1000;
  if (range === '1k_plus') return v >= 1000;
  return true;
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function Marketplace() {
  const { isEmployer } = useMode();
  const navigate       = useNavigate();

  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('all');
  const [sort,        setSort]        = useState('newest');
  const [payRange,    setPayRange]    = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (isEmployer) navigate('/', { replace: true });
  }, [isEmployer, navigate]);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['marketplace-jobs'],
    queryFn: () => Job.filter({ status: 'open' }, '-created_date', 200),
  });

  const hasActiveFilters = category !== 'all' || payRange !== 'all' || sort !== 'newest';

  const clearFilters = () => {
    setCategory('all');
    setSort('newest');
    setPayRange('all');
    setSearch('');
  };

  const filtered = jobs
    .filter(job => {
      const matchSearch = !search ||
        job.title?.toLowerCase().includes(search.toLowerCase()) ||
        job.kpi_summary?.toLowerCase().includes(search.toLowerCase());
      const matchCat  = category === 'all' || job.category === category;
      const matchPay  = inPayRange(job.payment_amount, payRange);
      return matchSearch && matchCat && matchPay;
    })
    .sort((a, b) => {
      if (sort === 'newest')   return new Date(b.created_date) - new Date(a.created_date);
      if (sort === 'oldest')   return new Date(a.created_date) - new Date(b.created_date);
      if (sort === 'pay_high') return (Number(b.payment_amount) || 0) - (Number(a.payment_amount) || 0);
      if (sort === 'pay_low')  return (Number(a.payment_amount) || 0) - (Number(b.payment_amount) || 0);
      if (sort === 'deadline') return new Date(a.deadline || '9999') - new Date(b.deadline || '9999');
      return 0;
    });

  if (isEmployer) return null;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          KPI-defined work — all jobs secured by escrow
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search jobs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 h-10 rounded-xl border text-sm font-medium transition-colors shrink-0 ${
            showFilters || hasActiveFilters
              ? 'border-primary bg-primary/8 text-primary'
              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {[category !== 'all', payRange !== 'all', sort !== 'newest'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Category pill filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              category === cat.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-border bg-card">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Pay range</p>
            <Select value={payRange} onValueChange={setPayRange}>
              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_RANGES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Sort by</p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="sm:col-span-2 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} job{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Job grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground text-sm mb-1">No jobs found</p>
          <p className="text-xs text-muted-foreground mb-4">
            {search || hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'No escrow-funded jobs available yet. Check back soon.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
