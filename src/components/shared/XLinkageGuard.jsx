import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Wrap any section that requires a linked X handle.
 * Shows a blocker with a direct link to Profile if not set.
 */
export default function XLinkageGuard({ children, feature = 'use this feature' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasX = !!(user?.x_handle && user.x_handle.trim().length > 0);
  if (hasX) return children;
  return (
    <Card className="border-chart-3/40 bg-chart-3/5">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-chart-3/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-chart-3">𝕏</span>
        </div>
        <div>
          <p className="font-semibold text-foreground">X profile required</p>
          <p className="text-sm text-muted-foreground mt-1">
            You need to link your X (Twitter) handle to {feature}. This helps verify identity within pods.
          </p>
        </div>
        <Button
          onClick={() => navigate('/profile')}
          className="bg-chart-3 text-white hover:bg-chart-3/90 gap-2"
        >
          <span className="text-base leading-none font-bold">𝕏</span>
          Link X profile in Profile
        </Button>
      </CardContent>
    </Card>
  );
}
