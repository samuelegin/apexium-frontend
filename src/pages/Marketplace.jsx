import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '@/lib/ModeContext';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, DollarSign, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import JobCard from '@/components/shared/JobCard';
import { Job } from '@/api/entities';

const CATEGORIES = [
  { value: 'all',         label: 'All Categories' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'development', label: 'Development' },
  { value: 'design',      label: 'Design' },
  { value: 'content',     label: 'Content' },
  { value: 'sales',       label: 'Sales' },
  { value: 'community',   label: 'Community' },
  { value: 'analytics',   label: 'Analytics' },
  { value: 'operations',  label: 'Operations' },
  { value: 'other',       label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest first' },
  { value: 'oldest',      label: 'Oldest first' },
  { value: 'pay_high',    label: 'Highest pay' },
  { value: 'pay_low',     label: 'Lowest pay' },
  { value: 'deadline',    label: 'Deadline soonest' },
];

const PAY_RANGES = [
  { value: 'all',    label: 'Any pay' },
  { value: '0_100',  label: 'Under $100' },
  { value: '100_500',label: '$100 – $500' },
  { value: '500_1k', label: '$500 – $1,000' },
  { value: '1k_plus',label: '$1,000+' },
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

export default function Marketplace() {
  const { isEmployer } = useMode();
  const { user }       = useAuth();
  const navigate       = useNavigate();

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');
  const [sort,     setSort]     = useState('newest');
  const [payRange, setPayRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (isEmployer) navigate('/', { replace: true });
  }, [isEmployer, navigate]);

  // Only fetch escrow-funded open jobs — unfunded jobs never show in marketplace
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['marketplace-jobs'],
    queryFn: () => Job.filter({}, '-created_date', 200), // backend already filters escrow_funded=1
  });

  const activeFilters = [
    category !== 'all' && category,
    payRange !== 'all' && PAY_RANGES.find(p => p.value === payRange)?.label,
    sort !== 'newest' && SORT_OPTIONS.find(s => s.value === sort)?.label,
  ].filter(Boolean);

  const filtered = jobs
    .filter(job => {
      const matchSearch = !search || job.title?.toLowerCase().includes(search.toLowerCase()) ||
                          job.kpi_summary?.toLowerCase().includes(search.toLowerCase());
      const matchCat    = category === 'all' || job.category === category;
      const matchPay    = inPayRange(job.payment_amount, payRange);
      return matchSearch && matchCat && matchPay;
    })
    .sort((a, b) => {
      if (sort === 'newest')   return new Date(b.created_date) - new Date(a.created_date);
      if (sort === 'oldest')   return new Date(a.created_date) - new Date(b.created_date);
      if (sort === 'pay_high') return (Number(b.payment_amount)||0) - (Number(a.payment_amount)||0);
      if (sort === 'pay_low')  return (Number(a.payment_amount)||0) - (Number(b.payment_amount)||0);
      if (sort === 'deadline') return new Date(a.deadline||'9999') - new Date(b.deadline||'9999');
      return 0;
    });

  if (isEmployer) return null;

  const clearFilters = () => { setCategory('all'); setSort('newest'); setPayRange('all'); setSearch(''); };

  return (
    <div className="space-y-5 pb-20 lg:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Job Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">KPI-defined work opportunities — all jobs secured by escrow</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(f => !f)}
          className={`gap-2 shrink-0 ${showFilters ? 'border-primary text-primary' : ''}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 ml-1">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border bg-card">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Category</p>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Pay range</p>
            <Select value={payRange} onValueChange={setPayRange}>
              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_RANGES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Sort by</p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map(f => (
            <Badge key={f} className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">{f}</Badge>
          ))}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} job{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </>
      ) : (
        <div className="text-center py-16 space-y-2">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium text-foreground">No jobs found</p>
          <p className="text-sm text-muted-foreground">
            {search || category !== 'all' || payRange !== 'all'
              ? 'Try adjusting your filters.'
              : 'No escrow-funded jobs available yet. Check back soon.'}
          </p>
          {activeFilters.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">Clear filters</Button>
          )}
        </div>
      )}
    </div>
  );
}
