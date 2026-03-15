import React, { useState, useEffect } from 'react';
import { hostelService } from '@/api/hostelService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { HostelItem } from '@/components/admin/HostelItem';
import { HostelEditor } from '@/components/admin/HostelEditor';
import { AddRoomWithSharingForm } from '@/components/admin/AddRoomWithSharingForm';
import { HostelStayPackageManager } from '@/components/admin/HostelStayPackageManager';
import { Plus, Building2, Search } from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { Badge } from '@/components/ui/badge';

const DEFAULT_PAGE_SIZE = 9;

interface HostelManagementProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
  onOpenQr?: (propertyId: string, propertyName: string) => void;
}

const HostelManagement: React.FC<HostelManagementProps> = ({ autoCreateNew, onTriggerConsumed, onOpenQr }) => {
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [messLinksMap, setMessLinksMap] = useState<Record<string, { mess_id: string; mess_name: string; is_default: boolean }[]>>({});
  const navigate = useNavigate();
  const { user, authChecked } = useAuth();

  // Only fetch after auth is ready
  useEffect(() => {
    if (authChecked && user?.id) {
      fetchHostels();
    }
  }, [authChecked, user?.id]);

  // Auto-create new when triggered from parent
  useEffect(() => {
    if (autoCreateNew) {
      handleAddHostel();
      onTriggerConsumed?.();
    }
  }, [autoCreateNew]);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (user?.role === 'admin') {
        data = await hostelService.getAllHostels({ admin: true });
      } else {
        data = await hostelService.getUserHostels();
      }
      setHostels(data || []);
    } catch (error) {
      console.error('Error fetching hostels:', error);
      setError('Unable to fetch data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch linked mess partners via secure RPC after hostels are loaded AND auth is ready
  useEffect(() => {
    if (!authChecked || !user?.id) return;
    if (hostels.length === 0) { setMessLinksMap({}); return; }
    const fetchLinks = async () => {
      const hostelIds = hostels.map((h: any) => h.id);
      const { data, error: rpcErr } = await supabase.rpc('get_hostel_linked_messes', { p_hostel_ids: hostelIds });
      if (rpcErr) {
        console.error('Error fetching mess links (RPC):', rpcErr);
        toast({ title: 'Warning', description: 'Could not load linked messes', variant: 'destructive' });
        return;
      }
      const map: Record<string, { mess_id: string; mess_name: string; is_default: boolean }[]> = {};
      (data || []).forEach((link: any) => {
        const hostelId = link.hostel_id;
        if (!map[hostelId]) map[hostelId] = [];
        map[hostelId].push({
          mess_id: link.mess_id,
          mess_name: link.mess_name || 'Unknown',
          is_default: link.is_default,
        });
      });
      setMessLinksMap(map);
    };
    fetchLinks();
  }, [hostels, authChecked, user?.id]);

  const handleAddHostel = () => { setSelectedHostel(null); setShowEditor(true); };
  const handleEditHostel = (hostel: any) => { setSelectedHostel(hostel); setShowEditor(true); };

  const handleDeleteHostel = async (hostelId: string) => {
    try {
      await hostelService.deleteHostel(hostelId);
      toast({ title: "Success", description: "Hostel deleted successfully" });
      fetchHostels();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete hostel", variant: "destructive" });
    }
  };

  const handleToggleActive = async (hostelId: string, isActive: boolean) => {
    try {
      await hostelService.toggleHostelActive(hostelId, isActive);
      toast({ title: "Success", description: `Hostel ${isActive ? 'activated' : 'deactivated'} successfully` });
      if (!isActive) {
        toast({ title: "Note", description: "Booking has been automatically paused" });
      }
      fetchHostels();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleToggleBooking = async (hostelId: string, isBookingActive: boolean) => {
    try {
      await hostelService.toggleHostelBooking(hostelId, isBookingActive);
      toast({ title: "Success", description: `Booking ${isBookingActive ? 'enabled' : 'paused'} successfully` });
      fetchHostels();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" });
    }
  };

  const handleTogglePartnerVisible = async (hostelId: string, isVisible: boolean) => {
    try {
      await hostelService.toggleHostelPartnerVisible(hostelId, isVisible);
      toast({ title: "Success", description: `Hostel ${isVisible ? 'shown' : 'hidden'} from employees` });
      fetchHostels();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update visibility", variant: "destructive" });
    }
  };

  const handleToggleStudentVisible = async (hostelId: string, isVisible: boolean) => {
    try {
      await supabase.from('hostels').update({ is_student_visible: isVisible } as any).eq('id', hostelId);
      toast({ title: "Success", description: `Hostel ${isVisible ? 'shown to' : 'hidden from'} students` });
      fetchHostels();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update student visibility", variant: "destructive" });
    }
  };

  const handleManageBeds = (hostelId: string) => {
    const hostel = hostels.find(h => h.id === hostelId);
    navigate(`/admin/hostels/${hostel?.serial_number || hostelId}/rooms`);
  };

  const handleManagePackages = (hostel: any) => { setSelectedHostel(hostel); setIsPackagesOpen(true); };

  const handleEditorSave = async (hostelData: any) => {
    try {
      if (selectedHostel?.id) {
        await hostelService.updateHostel(selectedHostel.id, hostelData);
      } else {
        await hostelService.createHostel(hostelData);
      }
      setShowEditor(false);
      fetchHostels();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save hostel", variant: "destructive" });
    }
  };

  const handleFormSuccess = () => { setIsRoomFormOpen(false); fetchHostels(); };

  // Filter & paginate
  const filtered = hostels.filter(h => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return h.name?.toLowerCase().includes(q) || h.serial_number?.toLowerCase().includes(q) || h.locality?.toLowerCase().includes(q);
  });
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (showEditor) {
    return (
      <ErrorBoundary>
        <HostelEditor
          existingHostel={selectedHostel}
          onSave={handleEditorSave}
          onCancel={() => setShowEditor(false)}
          isAdmin={user?.role === 'admin'}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Manage Hostels
              {filtered.length > 0 && <Badge variant="secondary" className="ml-2 text-xs font-normal">{filtered.length}</Badge>}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage all hostels and their rooms.</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'vendor') && (
            <Button onClick={handleAddHostel} size="sm" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Hostel
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hostels..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Unable to load hostels</p>
            <Button onClick={fetchHostels} variant="outline" size="sm" className="mt-4">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{searchQuery ? 'No hostels match your search' : 'No Hostels Found'}</p>
            <p className="text-xs text-muted-foreground mb-4">{searchQuery ? 'Try a different search term' : 'Start by adding your first hostel.'}</p>
            {!searchQuery && (user?.role === 'admin' || user?.role === 'vendor') && <Button onClick={handleAddHostel} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Hostel</Button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((hostel) => (
                <HostelItem
                  key={hostel.id}
                  hostel={hostel}
                  onEdit={handleEditHostel}
                  onDelete={handleDeleteHostel}
                  onManageBeds={handleManageBeds}
                  onManagePackages={handleManagePackages}
                  onToggleActive={handleToggleActive}
                  onToggleBooking={handleToggleBooking}
                  onTogglePartnerVisible={handleTogglePartnerVisible}
                  onToggleStudentVisible={handleToggleStudentVisible}
                  onDownloadQr={onOpenQr}
                  linkedMesses={messLinksMap[hostel.id] || []}
                />
              ))}
            </div>

            {/* Pagination */}
            <AdminTablePagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              pageSizeOptions={[9, 18, 36, 72]}
            />
          </>
        )}

        {/* Stay Packages Dialog */}
        <Dialog open={isPackagesOpen} onOpenChange={setIsPackagesOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Stay Packages - {selectedHostel?.name}</DialogTitle>
            </DialogHeader>
            {selectedHostel && <HostelStayPackageManager hostelId={selectedHostel.id} />}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default HostelManagement;
