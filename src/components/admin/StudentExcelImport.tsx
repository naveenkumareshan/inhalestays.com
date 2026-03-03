
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, User, Bed, CreditCard, AlertCircle, CheckCircle, Building2, BookOpen } from 'lucide-react';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PropertyType,
  validateStudentRows,
  parseExcelDate,
  processReadingRoomRow,
  processHostelRow,
} from '@/api/bulkBookingService';

// ── Types ───────────────────────────────────────────────────

interface StudentRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  name: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'validated' | 'processing' | 'completed' | 'failed';
  error?: string;
  bookingId?: string;
}

interface PropertyOption {
  id: string;
  name: string;
  floors?: { id: string; number: string }[];
}

// ── Component ───────────────────────────────────────────────

const StudentExcelImport = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [propertyType, setPropertyType] = useState<PropertyType>('reading_room');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);
  const floors = (selectedPropertyData?.floors || []) as { id: string; number: string }[];

  // ── Fetch properties ────────────────────────────────────

  useEffect(() => {
    setSelectedProperty('');
    setSelectedFloor(null);
    setStudents([]);
    setValidationErrors([]);

    const fetchProperties = async () => {
      if (propertyType === 'reading_room') {
        let query = supabase.from('cabins').select('id, name, floors');
        if (isPartner && user?.id) query = query.eq('created_by', user.id);
        const { data } = await query.order('name');
        setProperties(
          (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            floors: Array.isArray(c.floors) ? c.floors : [],
          }))
        );
      } else {
        let query = supabase.from('hostels').select('id, name');
        if (isPartner && user?.id) query = query.eq('created_by', user.id);
        const { data } = await query.order('name');
        setProperties((data || []).map((h: any) => ({ id: h.id, name: h.name })));
      }
    };
    fetchProperties();
  }, [propertyType, user?.id, isPartner]);

  // ── Download template ───────────────────────────────────

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Students');

    if (propertyType === 'reading_room') {
      const headers = ['name', 'email', 'phone', 'amount', 'key_deposite', 'startDate', 'endDate', 'seat_no', 'room_name', 'status', 'receipt_no', 'transaction_id', 'pay_mode'];
      const widths = [20, 25, 15, 10, 14, 14, 14, 10, 15, 10, 14, 16, 12];
      ws.columns = headers.map((h, i) => ({ header: h, key: h, width: widths[i] }));
      ws.addRow({ name: 'John Doe', email: 'john@example.com', phone: '9876543210', amount: 3000, key_deposite: 500, startDate: '01-03-2026', endDate: '01-04-2026', seat_no: 1, room_name: 'Room A', status: 'booked', receipt_no: 'RCP-001', transaction_id: 'TXN-001', pay_mode: 'Cash' });
      ws.addRow({ name: 'Jane Smith', email: 'jane@example.com', phone: '9123456780', amount: 3500, key_deposite: 500, startDate: '01-03-2026', endDate: '01-04-2026', seat_no: 2, room_name: 'Room A', status: 'booked', receipt_no: 'RCP-002', transaction_id: 'TXN-002', pay_mode: 'UPI' });
    } else {
      const headers = ['name', 'email', 'phone', 'amount', 'security_deposit', 'startDate', 'endDate', 'room_number', 'bed_number', 'transaction_id', 'pay_mode', 'receipt_no'];
      const widths = [20, 25, 15, 10, 16, 14, 14, 14, 12, 16, 12, 14];
      ws.columns = headers.map((h, i) => ({ header: h, key: h, width: widths[i] }));
      ws.addRow({ name: 'John Doe', email: 'john@example.com', phone: '9876543210', amount: 5000, security_deposit: 3000, startDate: '01-03-2026', endDate: '01-04-2026', room_number: '101', bed_number: 1, transaction_id: 'TXN-001', pay_mode: 'Cash', receipt_no: 'RCP-001' });
      ws.addRow({ name: 'Jane Smith', email: 'jane@example.com', phone: '9123456780', amount: 5500, security_deposit: 3000, startDate: '01-03-2026', endDate: '01-04-2026', room_number: '102', bed_number: 2, transaction_id: 'TXN-002', pay_mode: 'UPI', receipt_no: 'RCP-002' });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_import_${propertyType}_template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Template Downloaded', description: 'Fill in your student data and upload the file' });
  };

  // ── File upload & parse ─────────────────────────────────

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const worksheet = workbook.worksheets[0];
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || '');
      });

      const jsonData: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowObj: any = {};
        row.eachCell((cell, colNumber) => {
          rowObj[headers[colNumber - 1]] = cell.value;
        });
        jsonData.push(rowObj);
      });

      const parsed: StudentRow[] = jsonData
        .filter((row: any) => row.name && String(row.name).trim() !== '')
        .map((row: any) => ({
          ...row,
          name: row.name,
          email: row.email || (row.phone ? `${String(row.phone).replace(/\D/g, '')}@autogen.local` : ''),
          phone: row.phone ? String(row.phone) : '',
          status: 'pending' as const,
        }));

      const validation = validateStudentRows(parsed, propertyType);
      setValidationErrors(validation.errors);

      if (validation.valid) {
        setStudents(parsed.map(s => ({ ...s, status: 'validated' as const })));
        toast({ title: 'Excel Imported', description: `${parsed.length} students validated` });
      } else {
        setStudents(parsed);
        toast({ title: 'Validation Errors', description: `${validation.errors.length} errors found`, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Excel import error:', error);
      toast({ title: 'Import Failed', description: 'Failed to read Excel file', variant: 'destructive' });
    }
  };

  // ── Process all students ────────────────────────────────

  const processStudents = async () => {
    if (!selectedProperty || students.length === 0) {
      toast({ title: 'Missing Information', description: 'Select a property and import students', variant: 'destructive' });
      return;
    }
    if (validationErrors.length > 0) {
      toast({ title: 'Validation Errors', description: 'Fix errors before processing', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    setProgress(0);

    const results: StudentRow[] = [...students].map(s => ({ ...s, status: 'processing' as const }));
    setStudents(results);

    let completedN = 0;
    let failedN = 0;

    for (let i = 0; i < results.length; i++) {
      setCurrentStep(`Processing ${i + 1} of ${results.length}: ${results[i].name}`);
      setProgress(((i) / results.length) * 100);

      let result;
      if (propertyType === 'reading_room') {
        result = await processReadingRoomRow(results[i], selectedProperty, selectedFloor);
      } else {
        result = await processHostelRow(results[i], selectedProperty);
      }

      if (result.success) {
        results[i] = { ...results[i], status: 'completed' as const, bookingId: result.bookingId };
        completedN++;
      } else {
        results[i] = { ...results[i], status: 'failed' as const, error: result.error };
        failedN++;
      }

      setStudents([...results]);
    }

    setProgress(100);
    setCurrentStep('Done');
    setProcessing(false);
    toast({ title: 'Processing Complete', description: `${completedN} succeeded, ${failedN} failed` });
  };

  // ── Export results ──────────────────────────────────────

  const exportResults = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');
    const cols = ['name', 'email', 'phone', 'status', 'bookingId', 'error'];
    ws.columns = cols.map(c => ({ header: c, key: c, width: 22 }));
    students.forEach(s => ws.addRow({ name: s.name, email: s.email, phone: s.phone, status: s.status, bookingId: s.bookingId || '', error: s.error || '' }));
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_results_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Results Exported' });
  };

  // ── Status badge ────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { cls: string; icon?: React.ElementType }> = {
      pending: { cls: 'bg-gray-100 text-gray-800' },
      validated: { cls: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { cls: 'bg-yellow-100 text-yellow-800', icon: CreditCard },
      completed: { cls: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { cls: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    const c = cfg[status] || cfg.pending;
    const Icon = c.icon;
    return (
      <Badge className={c.cls}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  // ── Derived stats ───────────────────────────────────────

  const completedCount = students.filter(s => s.status === 'completed').length;
  const failedCount = students.filter(s => s.status === 'failed').length;
  const totalRevenue = students.filter(s => s.status === 'completed').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // ── Helper: format date for display ─────────────────────
  const fmtDate = (val: unknown) => {
    const d = parseExcelDate(val);
    return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : String(val);
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Student Excel Import & Bulk Booking</h1>
        <p className="text-muted-foreground">
          Import students from Excel and create bookings for Reading Rooms or Hostels
        </p>
      </div>

      {/* Property Type Selector */}
      <div className="flex gap-3 mb-4">
        <Button
          variant={propertyType === 'reading_room' ? 'default' : 'outline'}
          onClick={() => setPropertyType('reading_room')}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Reading Room
        </Button>
        <Button
          variant={propertyType === 'hostel' ? 'default' : 'outline'}
          onClick={() => setPropertyType('hostel')}
          className="flex items-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          Hostel
        </Button>
      </div>

      {/* Summary Cards */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /><div><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">{students.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-xl font-bold">{completedCount}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-600" /><div><p className="text-sm text-muted-foreground">Failed</p><p className="text-xl font-bold">{failedCount}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-600" /><div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-xl font-bold">₹{totalRevenue.toLocaleString()}</p></div></div></CardContent></Card>
        </div>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Students ({propertyType === 'reading_room' ? 'Reading Room' : 'Hostel'})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div className="flex-1">
              <Label htmlFor="excel-file">Upload Excel File</Label>
              <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </div>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Validation Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.slice(0, 5).map((e, i) => <li key={i} className="text-sm">{e}</li>)}
                  {validationErrors.length > 5 && <li className="text-sm">...and {validationErrors.length - 5} more</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {students.length > 0 && validationErrors.length === 0 && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-4">
                {/* Property selector */}
                <div className="flex-1 min-w-[200px]">
                  <Label>Select {propertyType === 'reading_room' ? 'Reading Room' : 'Hostel'}</Label>
                  <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedFloor(null); }}>
                    <SelectTrigger><SelectValue placeholder="Choose property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Floor selector (RR only) */}
                {propertyType === 'reading_room' && (
                  <div className="flex-1 min-w-[200px]">
                    <Label>Select Floor</Label>
                    <Select value={selectedFloor ?? ''} onValueChange={setSelectedFloor} disabled={!selectedProperty}>
                      <SelectTrigger><SelectValue placeholder={selectedProperty ? 'Choose floor' : 'Select property first'} /></SelectTrigger>
                      <SelectContent>
                        {floors.length > 0
                          ? floors.map(f => <SelectItem key={f.id} value={f.id}>{f.number}</SelectItem>)
                          : <div className="px-3 py-2 text-sm text-muted-foreground">No floors</div>}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Button onClick={processStudents} disabled={processing || !selectedProperty} className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Process All
                  </Button>
                  {students.some(s => s.status !== 'pending' && s.status !== 'validated') && (
                    <Button variant="outline" onClick={exportResults}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                  )}
                </div>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>{currentStep}</span><span>{Math.round(progress)}%</span></div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Table */}
      {students.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Imported Students ({students.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>{propertyType === 'reading_room' ? 'Seat / Room' : 'Room / Bed'}</TableHead>
                    <TableHead>Dates & Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4" /></div>
                          <div className="font-medium">{s.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.email}</div>
                        <div className="text-sm text-muted-foreground">{s.phone}</div>
                      </TableCell>
                      <TableCell>
                        {propertyType === 'reading_room' ? (
                          <div>
                            <div className="flex items-center gap-1"><Bed className="h-3 w-3" /> Seat #{s.seat_no}</div>
                            <div className="text-sm text-muted-foreground">{s.room_name}</div>
                          </div>
                        ) : (
                          <div>
                            <div>Room {s.room_number}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1"><Bed className="h-3 w-3" /> Bed #{s.bed_number}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                        </div>
                        <div className="text-sm font-medium text-green-600">₹{Number(s.amount || 0).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(s.status)}
                        {s.error && <div className="text-xs text-red-600 mt-1">{s.error}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs truncate max-w-[120px]" title={s.transaction_id}>{s.transaction_id}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentExcelImport;
