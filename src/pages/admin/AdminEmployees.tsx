import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Eye, Trash2, Users, KeyRound, Copy } from 'lucide-react';
import { getPublicAppUrl } from '@/utils/appUrl';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminEmployeeService, AdminEmployeeData } from '@/api/adminEmployeeService';
import { AdminEmployeeForm } from '@/components/admin/AdminEmployeeForm';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

const AdminEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<AdminEmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployeeData | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<AdminEmployeeData | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<AdminEmployeeData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await adminEmployeeService.getEmployees();
      if (response.success) setEmployees(response.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to fetch employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const response = await adminEmployeeService.deleteEmployee(id);
      if (response.success) {
        toast({ title: "Success", description: "Employee removed" });
        fetchEmployees();
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove employee", variant: "destructive" });
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordDialog || !newPassword) return;
    setResetLoading(true);
    try {
      if (!passwordDialog.employee_user_id) {
        // No auth account yet — create one via edge function
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            name: passwordDialog.name,
            email: passwordDialog.email,
            password: newPassword,
            role: 'admin_employee',
          },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (data?.userId) {
          await supabase
            .from('admin_employees')
            .update({ employee_user_id: data.userId })
            .eq('id', passwordDialog.id);
        }
        toast({ title: "Success", description: "Login account created successfully" });
        fetchEmployees();
      } else {
        const { data, error } = await supabase.functions.invoke('admin-reset-password', {
          body: { userId: passwordDialog.employee_user_id, newPassword },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Success", description: "Password updated successfully" });
      }
      setPasswordDialog(null);
      setNewPassword('');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showForm) {
    return (
      <AdminEmployeeForm
        employee={editingEmployee || undefined}
        onSubmit={handleFormSubmit}
        onCancel={() => { setShowForm(false); setEditingEmployee(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Admin Employees</h1>
          <Badge variant="secondary" className="text-[10px]">{employees.length} employees</Badge>
        </div>
        <Button size="sm" className="h-7 text-xs" onClick={() => { setEditingEmployee(null); setShowForm(true); }}>
          <Plus className="mr-1 h-3.5 w-3.5" />Add Employee
        </Button>
      </div>

      <div className="bg-muted/30 border rounded-lg p-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Employee login URL: <span className="font-mono font-medium text-foreground">{getPublicAppUrl()}/admin/login</span>
        </p>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 shrink-0" onClick={() => {
          navigator.clipboard.writeText(`${getPublicAppUrl()}/admin/login`);
          toast({ title: "Copied!", description: "Login URL copied to clipboard" });
        }}>
          <Copy className="h-3 w-3" /> Copy
        </Button>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium">No admin employees found</p>
            <p className="text-[10px] text-muted-foreground mt-1">Add your first admin employee to get started</p>
            <Button size="sm" className="mt-4 h-7 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3 w-12">S.No.</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Name</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Contact</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Role</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Status</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3">Permissions</TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider py-2 px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((emp, idx) => (
                <TableRow key={emp.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <TableCell className="text-[11px] py-1.5 px-3 text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                  <TableCell className="py-1.5 px-3">
                    <span className="font-medium text-[11px]">{emp.name}</span>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <div className="text-[10px] text-muted-foreground">{emp.email}</div>
                    <div className="text-[10px] text-muted-foreground">{emp.phone}</div>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <Badge variant={emp.role === 'manager' ? 'default' : 'secondary'} className="text-[9px] capitalize">{emp.role}</Badge>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {emp.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-1.5 px-3">
                    <div className="flex flex-wrap gap-0.5 max-w-[200px]">
                      {(emp.permissions || []).slice(0, 3).map(p => (
                        <Badge key={p} variant="outline" className="text-[8px] h-4 px-1">{p.replace(/_/g, ' ')}</Badge>
                      ))}
                      {(emp.permissions || []).length > 3 && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1">+{emp.permissions.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewingEmployee(emp)} title="View">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingEmployee(emp); setShowForm(true); }} title="Edit">
                        <Edit className="h-3 w-3" />
                      </Button>
                      {emp.employee_user_id && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setPasswordDialog(emp); setNewPassword(''); }} title="Reset Password">
                          <KeyRound className="h-3 w-3" />
                        </Button>
                      )}
                      {!emp.employee_user_id && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" onClick={() => { setPasswordDialog(emp); setNewPassword(''); }} title="Create Login">
                          <KeyRound className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(emp.id)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            currentPage={currentPage}
            totalItems={employees.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </div>
      )}

      {/* View Employee Dialog */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => { if (!open) setViewingEmployee(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Employee Details</DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg space-y-1">
                  <p className="font-medium text-xs mb-1">Personal Info</p>
                  <p><span className="text-muted-foreground">Name:</span> {viewingEmployee.name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {viewingEmployee.email}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {viewingEmployee.phone}</p>
                </div>
                <div className="p-3 border rounded-lg space-y-1">
                  <p className="font-medium text-xs mb-1">Work Info</p>
                  <p><span className="text-muted-foreground">Role:</span> <Badge variant="secondary" className="text-[9px] capitalize">{viewingEmployee.role}</Badge></p>
                  <p><span className="text-muted-foreground">Status:</span> <Badge variant={viewingEmployee.status === 'active' ? 'default' : 'destructive'} className="text-[9px]">{viewingEmployee.status}</Badge></p>
                  <p><span className="text-muted-foreground">Login:</span> <Badge variant={viewingEmployee.employee_user_id ? 'default' : 'secondary'} className="text-[9px]">{viewingEmployee.employee_user_id ? 'Active' : 'Not Created'}</Badge></p>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-xs mb-1.5">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {(viewingEmployee.permissions || []).map(p => (
                    <Badge key={p} variant="outline" className="text-[9px]">{p.replace(/_/g, ' ')}</Badge>
                  ))}
                  {(viewingEmployee.permissions || []).length === 0 && (
                    <p className="text-muted-foreground text-[10px]">No permissions assigned</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  Added on {new Date(viewingEmployee.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setViewingEmployee(null); setPasswordDialog(viewingEmployee); setNewPassword(''); }}>
                  <KeyRound className="h-3 w-3" />
                  {viewingEmployee.employee_user_id ? 'Reset Password' : 'Create Login'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset / Create Login Dialog */}
      <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{passwordDialog?.employee_user_id ? 'Reset Password' : 'Create Login'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {passwordDialog?.employee_user_id
                ? <>Set a new password for <strong>{passwordDialog?.name}</strong> ({passwordDialog?.email})</>
                : <>Create a login account for <strong>{passwordDialog?.name}</strong> ({passwordDialog?.email})</>
              }
            </p>
            <div>
              <Label className="text-xs">New Password</Label>
              <Input type="password" className="h-8 text-xs" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPasswordDialog(null)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handlePasswordReset} disabled={resetLoading || newPassword.length < 6}>
                {resetLoading ? 'Processing...' : (passwordDialog?.employee_user_id ? 'Reset Password' : 'Create Login')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployees;