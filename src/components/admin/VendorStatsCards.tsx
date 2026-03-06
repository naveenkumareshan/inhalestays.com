import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Users, Check, X, AlertTriangle, Clock1, Building } from 'lucide-react';
import { vendorApprovalService } from '@/api/vendorApprovalService';
import { supabase } from '@/integrations/supabase/client';

interface VendorStats {
  totalVendors: number;
  pendingApprovals: number;
  approvedVendors: number;
  rejectedVendors: number;
  suspendedVendors: number;
  totalRevenue: number;
  monthlyGrowth: number;
}

export const VendorStatsCards: React.FC = () => {
  const [stats, setStats] = useState<VendorStats>({
    totalVendors: 0,
    pendingApprovals: 0,
    approvedVendors: 0,
    rejectedVendors: 0,
    suspendedVendors: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  });
  const [totalProperties, setTotalProperties] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [result, cabinsRes, hostelsRes] = await Promise.all([
      vendorApprovalService.getVendorStats(),
      supabase.from('cabins').select('id', { count: 'exact', head: true }),
      supabase.from('hostels').select('id', { count: 'exact', head: true }),
    ]);
    if (result.success) {
      setStats(result.data.data);
    }
    setTotalProperties((cabinsRes.count || 0) + (hostelsRes.count || 0));
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="shadow-none border mb-4">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
        </div>
      </Card>
    );
  }

  const cards = [
    { label: 'Partners', value: stats.totalVendors, icon: Users, color: 'text-foreground' },
    { label: 'Pending', value: stats.pendingApprovals, icon: Clock1, color: 'text-blue-600' },
    { label: 'Approved', value: stats.approvedVendors, icon: Check, color: 'text-green-600' },
    { label: 'Rejected', value: stats.rejectedVendors, icon: X, color: 'text-red-600' },
    { label: 'Suspended', value: stats.suspendedVendors, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Properties', value: totalProperties, icon: Building, color: 'text-indigo-600' },
  ];

  return (
    <Card className="shadow-none border mb-4">
      <div className="flex items-center flex-wrap divide-x divide-border">
        {cards.map((card) => (
          <div key={card.label} className="flex items-center gap-1.5 px-3 py-2">
            <card.icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className={`text-sm font-bold ${card.color}`}>{card.value}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{card.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
