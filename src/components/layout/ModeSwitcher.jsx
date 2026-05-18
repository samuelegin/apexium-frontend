import React from 'react';
import { useMode } from '@/lib/ModeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { EMPLOYER_ONLY_PATHS, JOBBER_ONLY_PATHS } from '@/lib/ModeContext';
import { Briefcase, Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModeSwitcher({ collapsed = false }) {
  const { mode, switchMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isEmployer = mode === 'employer';

  const handleSwitch = (newMode) => {
    switchMode(newMode);
    // If current page is restricted in the new mode, redirect home
    const isOnEmployerOnly = EMPLOYER_ONLY_PATHS.some(p => location.pathname.startsWith(p));
    const isOnJobberOnly   = JOBBER_ONLY_PATHS.some(p => location.pathname.startsWith(p));
    if ((newMode === 'jobber' && isOnEmployerOnly) || (newMode === 'employer' && isOnJobberOnly)) {
      navigate('/');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium w-full touch-manipulation cursor-pointer
            ${isEmployer
              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-chart-1/40 bg-chart-1/10 text-chart-1 hover:bg-chart-1/15'
            }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 flex-1"
            >
              {isEmployer
                ? <Briefcase className="w-4 h-4 shrink-0" />
                : <Search className="w-4 h-4 shrink-0" />
              }
              {!collapsed && (
                <span className="truncate">{isEmployer ? 'Project' : 'Talent'}</span>
              )}
            </motion.div>
          </AnimatePresence>
          {!collapsed && <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 bg-card border-border">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Switch Mode
        </div>
        <DropdownMenuItem
          onClick={() => handleSwitch('jobber')}
          className={`gap-2 cursor-pointer ${mode === 'jobber' ? 'bg-chart-1/10 text-chart-1' : ''}`}
        >
          <Search className="w-4 h-4" />
          <div>
            <div className="font-medium">Talent Mode</div>
            <div className="text-xs text-muted-foreground">Find & complete work</div>
          </div>
          {mode === 'jobber' && <span className="ml-auto text-chart-1 text-xs">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSwitch('employer')}
          className={`gap-2 cursor-pointer ${mode === 'employer' ? 'bg-primary/10 text-primary' : ''}`}
        >
          <Briefcase className="w-4 h-4" />
          <div>
            <div className="font-medium">Project Mode</div>
            <div className="text-xs text-muted-foreground">Post jobs & manage work</div>
          </div>
          {mode === 'employer' && <span className="ml-auto text-primary text-xs">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}