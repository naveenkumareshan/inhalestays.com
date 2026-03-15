import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  RefreshCw,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

type TimeRange = '24h' | '7d' | '30d';

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

const EmailJobManagement: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [templateNames, setTemplateNames] = useState<string[]>([]);
  const limit = 25;

  const getStartDate = useCallback((range: TimeRange) => {
    const now = new Date();
    if (range === '24h') now.setHours(now.getHours() - 24);
    else if (range === '7d') now.setDate(now.getDate() - 7);
    else now.setDate(now.getDate() - 30);
    return now.toISOString();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = getStartDate(timeRange);

    try {
      // Fetch all logs for stats (deduplicated by message_id done client-side)
      let query = supabase
        .from('email_send_log')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      const { data: allLogs } = await query;

      // Deduplicate by message_id (keep latest)
      const deduped = deduplicateLogs(allLogs || []);

      // Compute stats
      const s: Stats = { total: deduped.length, sent: 0, failed: 0, pending: 0 };
      deduped.forEach(l => {
        if (l.status === 'sent') s.sent++;
        else if (['failed', 'dlq'].includes(l.status)) s.failed++;
        else if (l.status === 'pending') s.pending++;
      });
      setStats(s);

      // Get distinct template names
      const names = [...new Set(deduped.map(l => l.template_name))].sort();
      setTemplateNames(names);

      // Apply filters
      let filtered = deduped;
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed') {
          filtered = filtered.filter(l => ['failed', 'dlq'].includes(l.status));
        } else {
          filtered = filtered.filter(l => l.status === statusFilter);
        }
      }
      if (templateFilter !== 'all') {
        filtered = filtered.filter(l => l.template_name === templateFilter);
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(l => l.recipient_email.toLowerCase().includes(term));
      }

      setTotalCount(filtered.length);
      const start = (page - 1) * limit;
      setLogs(filtered.slice(start, start + limit));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [timeRange, statusFilter, templateFilter, searchTerm, page, getStartDate]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [timeRange, statusFilter, templateFilter, searchTerm]);

  const deduplicateLogs = (logs: EmailLog[]): EmailLog[] => {
    const map = new Map<string, EmailLog>();
    for (const log of logs) {
      const key = log.message_id || log.id;
      const existing = map.get(key);
      if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
        map.set(key, log);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1"><CheckCircle className="h-3 w-3" />Sent</Badge>;
      case 'failed':
      case 'dlq':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'suppressed':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 gap-1"><AlertTriangle className="h-3 w-3" />Suppressed</Badge>;
      default:
        return <Badge variant="outline" className="gap-1">{status}</Badge>;
    }
  };

  const formatTemplateName = (name: string) =>
    name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-bold">Email Reports</h2>
          <p className="text-sm text-muted-foreground">Monitor email delivery status</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-4 w-4 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-xl font-bold text-green-600">{stats.sent}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><XCircle className="h-4 w-4 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-4 w-4 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex gap-1">
              {(['24h', '7d', '30d'] as TimeRange[]).map(r => (
                <Button
                  key={r}
                  variant={timeRange === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(r)}
                  className="flex-1"
                >
                  {r === '24h' ? '24h' : r === '7d' ? '7 days' : '30 days'}
                </Button>
              ))}
            </div>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {templateNames.map(n => (
                  <SelectItem key={n} value={n}>{formatTemplateName(n)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Email Log ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-2" />
              <p className="text-sm">No emails found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {(page - 1) * limit + idx + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatTemplateName(log.template_name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {log.recipient_email}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                          {log.error_message || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailJobManagement;
