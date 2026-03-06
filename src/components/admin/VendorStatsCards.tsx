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
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-none border">
            <div className="p-3">
              <div className="animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-5 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Partners', value: stats.totalVendors, icon: Users, color: 'text-muted-foreground' },
    { label: 'Pending', value: stats.pendingApprovals, icon: Clock1, color: 'text-blue-600' },
    { label: 'Approved', value: stats.approvedVendors, icon: Check, color: 'text-green-600' },
    { label: 'Rejected', value: stats.rejectedVendors, icon: X, color: 'text-red-600' },
    { label: 'Suspended', value: stats.suspendedVendors, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Properties', value: totalProperties, icon: Building, color: 'text-indigo-600' },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-none border">
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
            </div>
            <div className={`text-xl font-bold ${card.color === 'text-muted-foreground' ? '' : card.color}`}>{card.value}</div>
          </div>
        </Card>
      ))}
    </div>
  );
};
