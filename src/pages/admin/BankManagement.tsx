import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Wallet, TrendingUp, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentModesManager } from '@/components/vendor/PaymentModesManager';
import { formatCurrency } from '@/utils/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface BankBalance {
  bankName: string;
  totalCredited: number;
  receiptCount: number;
}

const BankManagement: React.FC = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<BankBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const partnerId = user?.vendorId || user?.id;

  useEffect(() => {
    if (!partnerId) return;
    fetchBankBalances();
  }, [partnerId]);

  const fetchBankBalances = async () => {
    setLoading(true);
    try {
      const tables = ['receipts', 'hostel_receipts', 'mess_receipts', 'laundry_receipts'];

      const results = await Promise.all(
        tables.map((table) =>
          supabase
            .from(table as any)
            .select('amount, reconciled_bank_name')
            .eq('partner_user_id', partnerId!)
            .eq('reconciliation_status', 'approved')
            .not('reconciled_bank_name', 'is', null)
        )
      );

      const bankMap: Record<string, { total: number; count: number }> = {};

      for (const { data } of results) {
        if (!data) continue;
        for (const row of data) {
          const bank = (row as any).reconciled_bank_name || 'Unknown';
          const amt = Number((row as any).amount) || 0;
          if (!bankMap[bank]) bankMap[bank] = { total: 0, count: 0 };
          bankMap[bank].total += amt;
          bankMap[bank].count += 1;
        }
      }

      const list: BankBalance[] = Object.entries(bankMap)
        .map(([bankName, v]) => ({ bankName, totalCredited: v.total, receiptCount: v.count }))
        .sort((a, b) => b.totalCredited - a.totalCredited);

      setBalances(list);
    } catch (err) {
      console.error('Error fetching bank balances:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = useMemo(() => balances.reduce((s, b) => s + b.totalCredited, 0), [balances]);
  const totalReceipts = useMemo(() => balances.reduce((s, b) => s + b.receiptCount, 0), [balances]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" /> Bank Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your bank accounts and view bank-wise balance summaries from approved receipts.
        </p>
      </div>

      {/* Total Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Bank Balance</p>
              {loading ? (
                <Skeleton className="h-6 w-24 mt-1" />
              ) : (
                <p className="text-xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Approved Receipts</p>
              {loading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className="text-xl font-bold">{totalReceipts}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank-wise Balances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Bank-wise Balance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Balances computed from approved/reconciled receipts across all modules.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6">
              No approved receipts with bank info found yet.
            </div>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => (
                <div
                  key={b.bankName}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.bankName}</p>
                      <p className="text-xs text-muted-foreground">{b.receiptCount} receipts</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {formatCurrency(b.totalCredited)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Payment Modes Manager */}
      <PaymentModesManager />
    </div>
  );
};

export default BankManagement;
