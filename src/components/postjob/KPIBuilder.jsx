import React from 'react';
import { Plus, Trash2, Flame, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import KPISuggestions from './KPISuggestions';
import { KPI } from '@/api/entities';

export default function KPIBuilder({ kpis, setKpis, category }) {
  const totalWeight = kpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
  const maxWeightIndex = kpis.reduce(
    (maxI, k, i, arr) => (Number(k.weight) || 0) > (Number(arr[maxI]?.weight) || 0) ? i : maxI,
    0
  );
  const weightOk = totalWeight === 100;
  const weightOver = totalWeight > 100;

  const addKPI = () => {
    setKpis([...kpis, { name: '', target_value: '', weight: '', baseline: '' }]);
  };

  const removeKPI = (index) => {
    setKpis(kpis.filter((_, i) => i !== index));
  };

  const updateKPI = (index, field, value) => {
    const updated = [...kpis];
    updated[index] = { ...updated[index], [field]: value };
    setKpis(updated);
  };

  const isVague = (name) => {
    const vague = ['good', 'nice', 'better', 'improve', 'increase', 'grow', 'more', 'boost', 'build'];
    return name && vague.some(v => name.toLowerCase().includes(v)) && name.split(' ').length < 4;
  };

  const handleInsertSuggestion = (suggestion) => {
    setKpis([...kpis, { ...suggestion }]);
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestions */}
      {category && <KPISuggestions category={category} onInsert={handleInsertSuggestion} />}

      {/* Weight Status Bar */}
      <div className={`p-3 rounded-lg border transition-all ${
        weightOk ? 'border-emerald-300/70 bg-emerald-50' :
        weightOver ? 'border-destructive/40 bg-destructive/5' :
        'border-chart-3/40 bg-chart-3/5'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Total Weight</span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold font-mono ${
              weightOk ? 'text-emerald-700' : weightOver ? 'text-destructive' : 'text-chart-3'
            }`}>{totalWeight}%</span>
            <span className="text-xs text-muted-foreground">/ 100%</span>
            {weightOk && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
        </div>
        {/* Weight progress bar */}
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${weightOk ? 'bg-emerald-500' : weightOver ? 'bg-destructive' : 'bg-chart-3'}`}
            animate={{ width: `${Math.min(totalWeight, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        {!weightOk && (
          <p className="text-xs mt-1.5 flex items-center gap-1 text-muted-foreground">
            <AlertTriangle className={`w-3 h-3 ${weightOver ? 'text-destructive' : 'text-chart-3'}`} />
            {weightOver
              ? `Over by ${totalWeight - 100}%. Reduce weights to total exactly 100%.`
              : `${100 - totalWeight}% remaining. All weights must total exactly 100%.`
            }
          </p>
        )}
      </div>

      {/* Helper */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Define measurable outcomes. Example: "10 posts with 500+ impressions." The highest-weight KPI becomes the Primary KPI.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="space-y-3">
        {kpis.map((kpi, i) => {
          const isPrimary = i === maxWeightIndex && Number(kpi.weight) > 0;
          return (
            <Card key={i} className={`border transition-all ${
              isPrimary ? 'border-chart-3/50 bg-chart-3/5 shadow-md shadow-chart-3/5' : 'border-border bg-card'
            }`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPrimary ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-chart-3">
                        <Flame className="w-3 h-3" /> Primary KPI
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">KPI {i + 1}</span>
                    )}
                    {/* Weight contribution preview */}
                    {kpi.weight && (
                      <span className="text-[10px] text-muted-foreground">
                        — {kpi.weight}% of total score
                      </span>
                    )}
                  </div>
                  {kpis.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeKPI(i)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">KPI Name</Label>
                    <Input
                      placeholder="e.g. Social media posts published"
                      value={kpi.name}
                      onChange={(e) => updateKPI(i, 'name', e.target.value)}
                      className="bg-secondary/50 border-border mt-1"
                    />
                    {isVague(kpi.name) && (
                      <p className="flex items-center gap-1 text-xs text-chart-3 mt-1">
                        <AlertTriangle className="w-3 h-3" /> This KPI is vague. Add a measurable target (e.g. "Grow followers to 1,000").
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Target Value</Label>
                    <Input
                      placeholder="e.g. 10 posts"
                      value={kpi.target_value}
                      onChange={(e) => updateKPI(i, 'target_value', e.target.value)}
                      className="bg-secondary/50 border-border mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weight (%)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="e.g. 40"
                      value={kpi.weight}
                      onChange={(e) => updateKPI(i, 'weight', e.target.value)}
                      className="bg-secondary/50 border-border mt-1"
                    />
                    {kpi.weight && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Contributes {kpi.weight}% to total score
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Baseline (optional, for growth KPIs)</Label>
                    <Input
                      placeholder="e.g. Current followers: 500"
                      value={kpi.baseline}
                      onChange={(e) => updateKPI(i, 'baseline', e.target.value)}
                      className="bg-secondary/50 border-border mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" onClick={addKPI} className="w-full gap-2 border-dashed border-border">
        <Plus className="w-4 h-4" /> Add KPI
      </Button>
    </div>
  );
}