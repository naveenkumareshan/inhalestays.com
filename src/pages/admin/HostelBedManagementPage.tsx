import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { hostelBedCategoryService, HostelBedCategory } from '@/api/hostelBedCategoryService';
import { hostelFloorService, HostelFloor } from '@/api/hostelFloorService';
import { hostelSharingTypeService, HostelSharingType } from '@/api/hostelSharingTypeService';
import { formatCurrency } from '@/utils/currency';
import { isUUID } from '@/utils/idUtils';
import { ArrowLeft, Plus, Trash2, Pencil, BedDouble, Lock, Unlock, Settings, Layers, Eye, LayoutGrid, Map as MapIcon, Building, Users, Tag, RotateCw } from 'lucide-react';
import { HostelBedPlanDesigner, DesignerBed } from '@/components/hostels/HostelBedPlanDesigner';
import { HostelBedDetailsDialog } from '@/components/admin/HostelBedDetailsDialog';
import { BedShapeIcon } from '@/components/hostels/BedShapeIcon';

const AMENITY_OPTIONS = [
  'Attached Bathroom', 'Common Bathroom', 'Kitchen Access', 'Study Table',
  'Wardrobe', 'Bookshelf', 'Power Socket', 'Fan', 'AC', 'Window Side',
];

const HostelBedManagementPage = () => {
  const { hostelId } = useParams<{ hostelId: string }>();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [floorData, setFloorData] = useState<Record<string, any[]>>({});
  const [categories, setCategories] = useState<HostelBedCategory[]>([]);
  const [floors, setFloors] = useState<HostelFloor[]>([]);
  const [sharingTypes, setSharingTypes] = useState<HostelSharingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [configTab, setConfigTab] = useState('categories');

  // Layout plan designer state
  const [designerBeds, setDesignerBeds] = useState<DesignerBed[]>([]);
  const [selectedDesignerBed, setSelectedDesignerBed] = useState<DesignerBed | null>(null);
  const [roomLayout, setRoomLayout] = useState<any>(null);
  const [layoutImage, setLayoutImage] = useState<string | null>(null);
  const [layoutImageOpacity, setLayoutImageOpacity] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingOptions, setSharingOptions] = useState<any[]>([]);

  // Edit bed dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editBed, setEditBed] = useState<any>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editPriceOverride, setEditPriceOverride] = useState('');
  const [editBlockReason, setEditBlockReason] = useState('');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Add bed dialog
  const [addBedDialogOpen, setAddBedDialogOpen] = useState(false);
  const [addRoomIdInDialog, setAddRoomIdInDialog] = useState('');
  const [addSharingOptionId, setAddSharingOptionId] = useState('');
  const [addCount, setAddCount] = useState('1');
  const [addCategory, setAddCategory] = useState('');
  const [addAmenities, setAddAmenities] = useState<string[]>([]);
  const [addDialogSharingOptions, setAddDialogSharingOptions] = useState<any[]>([]);
  const [addPrice, setAddPrice] = useState('');

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Floor dialog
  const [floorDialogOpen, setFloorDialogOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorOrder, setNewFloorOrder] = useState('1');

  // Sharing type dialog
  const [sharingTypeDialogOpen, setSharingTypeDialogOpen] = useState(false);
  const [newSharingName, setNewSharingName] = useState('');
  const [newSharingCapacity, setNewSharingCapacity] = useState('1');

  // Add room dialog
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloorId, setNewRoomFloorId] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  // Rename room
  const [renameRoomId, setRenameRoomId] = useState<string | null>(null);
  const [renameRoomValue, setRenameRoomValue] = useState('');

  // Bed details dialog
  const [detailsBedId, setDetailsBedId] = useState<string | null>(null);
  const [detailsBedNumber, setDetailsBedNumber] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'bed' | 'room' | 'floor'; id: string; name: string } | null>(null);

  useEffect(() => {
    if (hostelId) fetchAll();
  }, [hostelId]);

  // Auto-select first floor when floors load
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors]);

  // Auto-select first room when floor changes
  useEffect(() => {
    if (!selectedFloorId) return;
    const floorRooms = rooms.filter(r => r.floor_id === selectedFloorId);
    if (floorRooms.length > 0) {
      setSelectedRoomId(floorRooms[0].id);
    } else {
      setSelectedRoomId('');
    }
  }, [selectedFloorId, rooms]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Resolve hostelId: try serial_number first, fall back to UUID
      let resolvedId = hostelId!;
      if (!isUUID(hostelId!)) {
        const { data: h } = await supabase.from('hostels').select('id').eq('serial_number', hostelId).maybeSingle();
        if (h) resolvedId = h.id;
      }
      const { data: h } = await supabase.from('hostels').select('*').eq('id', resolvedId).single();
      setHostel(h);

      const [catResult, floorResult, sharingResult] = await Promise.all([
        hostelBedCategoryService.getCategories(resolvedId),
        hostelFloorService.getFloors(resolvedId),
        hostelSharingTypeService.getSharingTypes(resolvedId),
      ]);
      if (catResult.success) setCategories(catResult.data);
      if (floorResult.success) setFloors(floorResult.data);
      if (sharingResult.success) setSharingTypes(sharingResult.data);

      const { data: roomsData } = await supabase
        .from('hostel_rooms')
        .select('id, room_number, floor, category, room_width, room_height, layout_image, layout_image_opacity, floor_id, category_id, sharing_type_id')
        .eq('hostel_id', resolvedId)
        .eq('is_active', true)
        .order('floor')
        .order('room_number');

      setRooms(roomsData || []);

      if (roomsData?.length) {
        const roomIds = roomsData.map(r => r.id);

        const { data: opts } = await supabase
          .from('hostel_sharing_options')
          .select('*')
          .in('room_id', roomIds)
          .eq('is_active', true);

        const { data: beds } = await supabase
          .from('hostel_beds')
          .select('*, hostel_sharing_options(type, price_monthly)')
          .in('room_id', roomIds)
          .order('bed_number');

        const { data: bookings } = await supabase
          .from('hostel_bookings')
          .select('bed_id, profiles:user_id(name)')
          .eq('hostel_id', resolvedId)
          .in('status', ['confirmed', 'pending']);

        const bookingMap = new Map<string, string>();
        bookings?.forEach((b: any) => bookingMap.set(b.bed_id, b.profiles?.name || 'Occupied'));

        const grouped: Record<string, any[]> = {};
        roomsData.forEach(room => {
          const floorKey = room.floor_id
            ? (floorResult.success ? floorResult.data.find(f => f.id === room.floor_id)?.name || 'Unassigned' : 'Unassigned')
            : 'Unassigned';
          if (!grouped[floorKey]) grouped[floorKey] = [];
          const roomOpts = (opts || []).filter(s => s.room_id === room.id);
          const roomBeds = (beds || []).filter(b => b.room_id === room.id).map(b => ({
            id: b.id, bed_number: b.bed_number, is_available: b.is_available, is_blocked: b.is_blocked,
            block_reason: b.block_reason, room_id: b.room_id, sharing_option_id: b.sharing_option_id,
            category: b.category, price_override: b.price_override, position_x: b.position_x, position_y: b.position_y,
            amenities: b.amenities || [],
            sharingType: b.hostel_sharing_options?.type || '', sharingPrice: b.hostel_sharing_options?.price_monthly || 0,
            occupantName: bookingMap.get(b.id) || undefined,
          }));
          grouped[floorKey].push({
            roomId: room.id, roomNumber: room.room_number, roomCategory: room.category,
            floor: room.floor, sharingOptions: roomOpts, beds: roomBeds,
            categoryName: catResult.success ? catResult.data.find(c => c.id === room.category_id)?.name : undefined,
            sharingTypeName: sharingResult.success ? sharingResult.data.find(s => s.id === room.sharing_type_id)?.name : undefined,
          });
        });
        setFloorData(grouped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reusable function to load designer data for a room
  const loadDesignerData = useCallback(async (roomId: string) => {
    if (!roomId) return;
    const room = rooms.find(r => r.id === roomId);
    setRoomLayout(room);
    setLayoutImage(room?.layout_image || null);
    setLayoutImageOpacity(room?.layout_image_opacity ?? 30);

    const { data: opts } = await supabase
      .from('hostel_sharing_options')
      .select('id, type, price_monthly')
      .eq('room_id', roomId)
      .eq('is_active', true);
    setSharingOptions(opts || []);

    const { data: beds } = await supabase
      .from('hostel_beds')
      .select('*, hostel_sharing_options(type, price_monthly)')
      .eq('room_id', roomId)
      .order('bed_number');

    const { data: bookings } = await supabase
      .from('hostel_bookings')
      .select('bed_id, profiles:user_id(name)')
      .eq('hostel_id', hostelId)
      .in('status', ['confirmed', 'pending']);

    const bookingMap = new Map<string, string>();
    bookings?.forEach((b: any) => bookingMap.set(b.bed_id, b.profiles?.name || 'Occupied'));

    setDesignerBeds((beds || []).map(b => ({
      id: b.id, bed_number: b.bed_number, position_x: b.position_x || 0, position_y: b.position_y || 0,
      is_available: b.is_available, is_blocked: b.is_blocked, category: b.category, price_override: b.price_override,
      sharing_option_id: b.sharing_option_id, sharingType: b.hostel_sharing_options?.type,
      sharingPrice: b.hostel_sharing_options?.price_monthly, occupantName: bookingMap.get(b.id),
      rotation: (b as any).rotation || 0,
    })));
  }, [rooms, hostelId]);

  // Load designer beds when room changes
  useEffect(() => {
    if (!selectedRoomId) return;
    loadDesignerData(selectedRoomId);
  }, [selectedRoomId]);

  const handleGridBedClick = (bed: any) => {
    setEditBed(bed);
    setEditCategory(bed.category || '');
    setEditPriceOverride(bed.price_override?.toString() || '');
    setEditBlockReason(bed.block_reason || '');
    setEditAmenities(bed.amenities || []);
    setEditDialogOpen(true);
  };

  const handleSaveBed = async () => {
    if (!editBed) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('hostel_beds').update({
        category: editCategory || null,
        price_override: editPriceOverride ? Number(editPriceOverride) : null,
        amenities: editAmenities,
      }).eq('id', editBed.id);
      if (error) throw error;
      toast({ title: 'Bed updated' });
      setEditDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggleBlock = async () => {
    if (!editBed) return;
    setSaving(true);
    try {
      const newBlocked = !editBed.is_blocked;
      const { error } = await supabase.from('hostel_beds').update({
        is_blocked: newBlocked, block_reason: newBlocked ? editBlockReason : null,
      }).eq('id', editBed.id);
      if (error) throw error;
      toast({ title: newBlocked ? 'Bed blocked' : 'Bed unblocked' });
      setEditDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Trigger delete confirmation for a bed
  const requestDeleteBed = (bedId: string, bedNumber: number, occupantName?: string) => {
    if (occupantName) {
      toast({ title: 'Cannot delete', description: 'This bed is currently occupied. Remove the booking first.', variant: 'destructive' });
      return;
    }
    setDeleteConfirm({ type: 'bed', id: bedId, name: `Bed #${bedNumber}` });
  };

  const executeDeleteBed = async (bedId: string) => {
    try {
      const { error } = await supabase.from('hostel_beds').delete().eq('id', bedId);
      if (error) throw error;
      toast({ title: 'Bed deleted' });
      setEditDialogOpen(false);
      await fetchAll();
      if (selectedRoomId) loadDesignerData(selectedRoomId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Trigger delete confirmation for a room (with dependency check)
  const requestDeleteRoom = async (roomId: string, roomNumber: string) => {
    // Check if room has beds
    const { count } = await supabase.from('hostel_beds').select('id', { count: 'exact', head: true }).eq('room_id', roomId);
    if (count && count > 0) {
      toast({ title: 'Cannot delete room', description: `Delete all ${count} bed(s) in this room first.`, variant: 'destructive' });
      return;
    }
    setDeleteConfirm({ type: 'room', id: roomId, name: roomNumber });
  };

  const executeDeleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase.from('hostel_rooms').update({ is_active: false } as any).eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Room deleted (existing bookings preserved)' });
      if (selectedRoomId === roomId) setSelectedRoomId('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Trigger delete confirmation for a floor (with dependency check)
  const requestDeleteFloor = async (floorId: string, floorName: string) => {
    const floorRoomsList = rooms.filter(r => r.floor_id === floorId);
    if (floorRoomsList.length > 0) {
      toast({ title: 'Cannot delete floor', description: `Delete all ${floorRoomsList.length} room(s) on this floor first.`, variant: 'destructive' });
      return;
    }
    setDeleteConfirm({ type: 'floor', id: floorId, name: floorName });
  };

  const executeDeleteFloor = async (floorId: string) => {
    const result = await hostelFloorService.deleteFloor(floorId);
    if (result.success) {
      toast({ title: 'Floor removed' });
      if (hostelId) {
        const floorResult = await hostelFloorService.getFloors(hostelId);
        if (floorResult.success) setFloors(floorResult.data);
      }
    }
  };

  // Execute confirmed delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);
    if (type === 'bed') await executeDeleteBed(id);
    else if (type === 'room') await executeDeleteRoom(id);
    else if (type === 'floor') await executeDeleteFloor(id);
  };

  const loadAddDialogSharingOptions = (_roomId: string) => {
    setAddDialogSharingOptions(sharingTypes.map(st => ({ id: st.id, type: st.name, capacity: st.capacity })));
  };

  const handleAddRoomChange = (roomId: string) => {
    setAddRoomIdInDialog(roomId);
    setAddSharingOptionId('');
    loadAddDialogSharingOptions(roomId);
  };

  const handleAddBeds = async () => {
    const targetRoomId = addRoomIdInDialog || selectedRoomId;
    if (!targetRoomId || !addSharingOptionId || !addCount) return;
    setSaving(true);
    try {
      const selectedSharingType = sharingTypes.find(st => st.id === addSharingOptionId);
      if (!selectedSharingType) throw new Error('Invalid sharing type');

      const { data: existingOpts } = await supabase
        .from('hostel_sharing_options')
        .select('id')
        .eq('room_id', targetRoomId)
        .eq('type', selectedSharingType.name)
        .eq('is_active', true)
        .limit(1);

      let sharingOptionId: string;
      if (existingOpts && existingOpts.length > 0) {
        sharingOptionId = existingOpts[0].id;
      } else {
        const { data: newOpt, error: optError } = await supabase
          .from('hostel_sharing_options')
          .insert({
            room_id: targetRoomId,
            type: selectedSharingType.name,
            capacity: selectedSharingType.capacity,
            total_beds: 0,
          } as any)
          .select('id')
          .single();
        if (optError) throw optError;
        sharingOptionId = newOpt.id;
      }

      const { data: existing } = await supabase
        .from('hostel_beds')
        .select('bed_number')
        .eq('room_id', targetRoomId)
        .order('bed_number', { ascending: false })
        .limit(1);
      let startNum = (existing?.[0]?.bed_number || 0) + 1;
      const count = parseInt(addCount);
      const beds = [];
      for (let i = 0; i < count; i++) {
        beds.push({
          room_id: targetRoomId,
          sharing_option_id: sharingOptionId,
          sharing_type_id: addSharingOptionId,
          bed_number: startNum + i,
          category: addCategory || null,
          amenities: addAmenities,
          price_override: addPrice ? Number(addPrice) : null,
        });
      }
      const { error } = await supabase.from('hostel_beds').insert(beds as any);
      if (error) throw error;
      toast({ title: `${count} bed(s) added` });
      setAddBedDialogOpen(false);
      setAddCount('1'); setAddCategory(''); setAddAmenities([]); setAddRoomIdInDialog(''); setAddPrice('');
      await fetchAll();
      // Sync layout plan
      if (targetRoomId) loadDesignerData(targetRoomId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSaveLayout = async () => {
    if (!selectedRoomId) return;
    setIsSaving(true);
    try {
      await supabase.from('hostel_rooms').update({
        layout_image: layoutImage, layout_image_opacity: layoutImageOpacity,
      }).eq('id', selectedRoomId);
      const updates = designerBeds.map(b =>
        supabase.from('hostel_beds').update({ position_x: b.position_x, position_y: b.position_y, rotation: (b as any).rotation || 0 } as any).eq('id', b.id)
      );
      await Promise.all(updates);
      toast({ title: 'Layout saved successfully' });
    } catch (e) {
      toast({ title: 'Error saving layout', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  const handlePlaceBed = async (position: { x: number; y: number }, number: number, sharingOptionId: string, category: string) => {
    if (!selectedRoomId) return;
    try {
      const { data, error } = await supabase.from('hostel_beds').insert({
        room_id: selectedRoomId, sharing_option_id: sharingOptionId, bed_number: number,
        category: category && category !== 'none' ? category : null,
        position_x: position.x, position_y: position.y,
      }).select('*, hostel_sharing_options(type, price_monthly)').single();
      if (error) throw error;
      if (data) {
        setDesignerBeds(prev => [...prev, {
          id: data.id, bed_number: data.bed_number, position_x: data.position_x, position_y: data.position_y,
          is_available: data.is_available, is_blocked: data.is_blocked, category: data.category,
          price_override: data.price_override, sharing_option_id: data.sharing_option_id,
          sharingType: data.hostel_sharing_options?.type, sharingPrice: data.hostel_sharing_options?.price_monthly,
        }]);
        toast({ title: `Bed #${number} placed` });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleBedMove = async (bedId: string, position: { x: number; y: number }) => {
    await supabase.from('hostel_beds').update({ position_x: position.x, position_y: position.y }).eq('id', bedId);
  };

  const handleBedRotate = async (bedId: string, rotation: number) => {
    setDesignerBeds(prev => prev.map(b => b.id === bedId ? { ...b, rotation } : b));
    await supabase.from('hostel_beds').update({ rotation } as any).eq('id', bedId);
  };

  const handleDeleteDesignerBed = async (bedId: string) => {
    try {
      await supabase.from('hostel_beds').delete().eq('id', bedId);
      setDesignerBeds(prev => prev.filter(b => b.id !== bedId));
      toast({ title: 'Bed deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !hostelId) return;
    setSaving(true);
    try {
      const result = await hostelBedCategoryService.createCategory(hostelId, newCatName, 0);
      if (!result.success) throw new Error('Failed');
      toast({ title: 'Category added' });
      setNewCatName('');
      const catResult = await hostelBedCategoryService.getCategories(hostelId);
      if (catResult.success) setCategories(catResult.data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    // Check if any beds use this category
    const cat = categories.find(c => c.id === id);
    if (cat) {
      const { count } = await supabase
        .from('hostel_beds')
        .select('id', { count: 'exact', head: true })
        .eq('category', cat.name);
      if (count && count > 0) {
        toast({ title: 'Cannot delete', description: `Delete all ${count} bed(s) with category "${cat.name}" first.`, variant: 'destructive' });
        return;
      }
    }
    const result = await hostelBedCategoryService.deleteCategory(id);
    if (result.success) {
      toast({ title: 'Category deleted' });
      if (hostelId) {
        const catResult = await hostelBedCategoryService.getCategories(hostelId);
        if (catResult.success) setCategories(catResult.data);
      }
    }
  };

  const handleAddFloor = async () => {
    if (!newFloorName.trim() || !hostelId) return;
    setSaving(true);
    try {
      const result = await hostelFloorService.createFloor(hostelId, newFloorName, Number(newFloorOrder) || 1);
      if (!result.success) throw new Error('Failed');
      toast({ title: 'Floor added' });
      setNewFloorName(''); setNewFloorOrder(String((floors.length || 0) + 1));
      const floorResult = await hostelFloorService.getFloors(hostelId);
      if (floorResult.success) setFloors(floorResult.data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleAddSharingType = async () => {
    if (!newSharingName.trim() || !hostelId) return;
    setSaving(true);
    try {
      const result = await hostelSharingTypeService.createSharingType(hostelId, newSharingName, Number(newSharingCapacity) || 1);
      if (!result.success) throw new Error('Failed');
      toast({ title: 'Sharing type added' });
      setNewSharingName(''); setNewSharingCapacity('1');
      const stResult = await hostelSharingTypeService.getSharingTypes(hostelId);
      if (stResult.success) setSharingTypes(stResult.data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteSharingType = async (id: string) => {
    // Check if any beds use sharing options of this type
    const st = sharingTypes.find(s => s.id === id);
    if (st) {
      const { count } = await supabase
        .from('hostel_beds')
        .select('id', { count: 'exact', head: true })
        .eq('sharing_type_id', id);
      if (count && count > 0) {
        toast({ title: 'Cannot delete', description: `Delete all ${count} bed(s) using sharing type "${st.name}" first.`, variant: 'destructive' });
        return;
      }
    }
    const result = await hostelSharingTypeService.deleteSharingType(id);
    if (result.success) {
      toast({ title: 'Sharing type removed' });
      if (hostelId) {
        const stResult = await hostelSharingTypeService.getSharingTypes(hostelId);
        if (stResult.success) setSharingTypes(stResult.data);
      }
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomNumber.trim() || !newRoomFloorId || !hostelId) return;
    setSaving(true);
    try {
      const selectedFloor = floors.find(f => f.id === newRoomFloorId);
      const { error } = await supabase.from('hostel_rooms').insert({
        hostel_id: hostelId,
        room_number: newRoomNumber,
        floor: selectedFloor?.floor_order || 1,
        floor_id: newRoomFloorId,
        description: newRoomDescription || '',
      } as any);
      if (error) throw error;

      toast({ title: 'Room added' });
      setAddRoomDialogOpen(false);
      setNewRoomNumber(''); setNewRoomFloorId(''); setNewRoomDescription('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleRenameRoom = async (roomId: string) => {
    if (!renameRoomValue.trim()) return;
    try {
      const { error } = await supabase.from('hostel_rooms').update({ room_number: renameRoomValue } as any).eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Room renamed' });
      setRenameRoomId(null);
      setRenameRoomValue('');
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const toggleAmenity = (amenity: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
  };

  // Get beds for the currently selected room
  const getSelectedRoomBeds = () => {
    const allRoomData = Object.values(floorData).flat();
    const roomData = allRoomData.find((r: any) => r.roomId === selectedRoomId);
    return roomData?.beds || [];
  };

  const selectedRoomBeds = getSelectedRoomBeds();
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const floorRooms = rooms.filter(r => r.floor_id === selectedFloorId);

  if (loading && !hostel) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold">{hostel?.name}</h1>
          <span className="text-xs text-muted-foreground">{hostel?.gender} • {hostel?.stay_type}</span>
        </div>
      </div>

      {/* ═══ Configuration Panel ═══ */}
      <div className="border rounded-lg p-3">
        <Tabs value={configTab} onValueChange={setConfigTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="categories" className="text-xs"><Tag className="h-3.5 w-3.5 mr-1" />Categories</TabsTrigger>
            <TabsTrigger value="sharing" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />Sharing Types</TabsTrigger>
            <TabsTrigger value="floors" className="text-xs"><Layers className="h-3.5 w-3.5 mr-1" />Floors</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="pt-3">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Configure bed categories like AC / Non-AC. Price is set per bed.</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                    <span className="font-medium">{cat.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {categories.length === 0 && <span className="text-xs text-muted-foreground">No categories yet</span>}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="e.g. AC" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleAddCategory} disabled={saving || !newCatName.trim()}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </TabsContent>

          {/* Sharing Types Tab */}
          <TabsContent value="sharing" className="pt-3">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Configure sharing types: Single, Two Sharing, Dormitory, etc.</p>
              <div className="flex flex-wrap gap-2">
                {sharingTypes.map(st => (
                  <div key={st.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                    <span className="font-medium">{st.name}</span>
                    <span className="text-muted-foreground">({st.capacity} beds)</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => handleDeleteSharingType(st.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {sharingTypes.length === 0 && <span className="text-xs text-muted-foreground">No sharing types yet</span>}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="e.g. Two Sharing" value={newSharingName} onChange={e => setNewSharingName(e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Capacity" value={newSharingCapacity} onChange={e => setNewSharingCapacity(e.target.value)} className="w-24" />
                <Button size="sm" onClick={handleAddSharingType} disabled={saving || !newSharingName.trim()}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </TabsContent>

          {/* Floors Tab */}
          <TabsContent value="floors" className="pt-3">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Create and manage floors for this hostel.</p>
              <div className="flex flex-wrap gap-2">
                {floors.map(floor => (
                  <div key={floor.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                    <span className="font-medium">{floor.name}</span>
                    <span className="text-muted-foreground">(Order: {floor.floor_order})</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => requestDeleteFloor(floor.id, floor.name)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {floors.length === 0 && <span className="text-xs text-muted-foreground">No floors yet</span>}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="e.g. Ground Floor" value={newFloorName} onChange={e => setNewFloorName(e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Order" value={newFloorOrder} onChange={e => setNewFloorOrder(e.target.value)} className="w-20" />
                <Button size="sm" onClick={handleAddFloor} disabled={saving || !newFloorName.trim()}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* ═══ Floor Tabs ═══ */}
      {floors.length > 0 ? (
        <div className="space-y-3">
          {/* Total bed counts summary */}
          {(() => {
            const allBeds = Object.values(floorData).flat().flatMap((r: any) => r.beds || []);
            const totalBeds = allBeds.length;
            const availableBeds = allBeds.filter((b: any) => b.is_available && !b.is_blocked).length;
            return totalBeds > 0 ? (
              <div className="text-xs text-muted-foreground px-1">
                Total: <span className="font-semibold text-foreground">{totalBeds} beds</span> ({availableBeds} available)
              </div>
            ) : null;
          })()}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {floors.map(floor => {
              const floorRoomsList = rooms.filter(r => r.floor_id === floor.id);
              const floorBedCount = floorRoomsList.reduce((sum, room) => {
                const allRoomData = Object.values(floorData).flat();
                const roomData = allRoomData.find((r: any) => r.roomId === room.id);
                return sum + (roomData?.beds?.length || 0);
              }, 0);
              return (
                <button
                  key={floor.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
                    selectedFloorId === floor.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 hover:bg-accent border-border text-foreground'
                  }`}
                  onClick={() => setSelectedFloorId(floor.id)}
                >
                  <Layers className="h-3.5 w-3.5 inline mr-1.5" />
                  {floor.name}
                  <span className="ml-1 opacity-75">({floorBedCount})</span>
                </button>
              );
            })}
          </div>

          {/* ═══ Room Pills ═══ */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {floorRooms.length > 0 ? (
              <>
                {floorRooms.map(room => {
                  const allRoomData = Object.values(floorData).flat();
                  const roomData = allRoomData.find((r: any) => r.roomId === room.id);
                  const bedCount = roomData?.beds?.length || 0;
                  const availBeds = roomData?.beds?.filter((b: any) => b.is_available && !b.is_blocked).length || 0;
                  const isRenaming = renameRoomId === room.id;
                  return (
                    <div key={room.id} className="flex items-center gap-0.5">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={renameRoomValue}
                            onChange={e => setRenameRoomValue(e.target.value)}
                            className="h-7 w-24 text-xs"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameRoom(room.id); if (e.key === 'Escape') setRenameRoomId(null); }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRenameRoom(room.id)}>✓</Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRenameRoomId(null)}>✕</Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                              selectedRoomId === room.id
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-accent border-border'
                            }`}
                            onClick={() => setSelectedRoomId(room.id)}
                          >
                            <Building className="h-3 w-3 inline mr-1" />
                            {room.room_number}
                            <span className="ml-1 opacity-75">({availBeds}/{bedCount})</span>
                          </button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenameRoomId(room.id); setRenameRoomValue(room.room_number); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => requestDeleteRoom(room.id, room.room_number)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs rounded-full"
                  onClick={() => {
                    setNewRoomFloorId(selectedFloorId);
                    setAddRoomDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Room
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">No rooms on this floor.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setNewRoomFloorId(selectedFloorId);
                    setAddRoomDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Room
                </Button>
              </div>
            )}
          </div>

          {/* ═══ Add Beds Button ═══ */}
          {selectedRoomId && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setAddSharingOptionId(''); setAddCategory(''); setAddAmenities([]); setAddPrice('');
                setAddRoomIdInDialog(selectedRoomId);
                loadAddDialogSharingOptions(selectedRoomId);
                setAddBedDialogOpen(true);
              }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Beds
              </Button>
              <span className="text-xs text-muted-foreground">
                to {selectedRoom?.room_number}
              </span>
            </div>
          )}

          {/* ═══ Compact Bed Grid for selected room ═══ */}
          {selectedRoomId && selectedRoomBeds.length > 0 ? (
            <div className="border rounded-xl p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{selectedRoom?.room_number}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {selectedRoomBeds.filter((b: any) => b.is_available && !b.is_blocked).length}/{selectedRoomBeds.length} available
                </span>
              </div>
              <Progress
                value={selectedRoomBeds.length > 0
                  ? ((selectedRoomBeds.length - selectedRoomBeds.filter((b: any) => b.is_available && !b.is_blocked).length) / selectedRoomBeds.length) * 100
                  : 0}
                className="h-1.5 mb-3"
              />
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {selectedRoomBeds.map((bed: any) => {
                  const isAvail = bed.is_available && !bed.is_blocked;
                  const isBlocked = bed.is_blocked;
                  let statusColor = 'border-emerald-400 bg-emerald-50/50';
                  let statusDot = 'bg-emerald-500';
                  if (isBlocked) {
                    statusColor = 'border-destructive/30 bg-destructive/5';
                    statusDot = 'bg-destructive';
                  } else if (!isAvail) {
                    statusColor = 'border-blue-400 bg-blue-50/50';
                    statusDot = 'bg-blue-500';
                  }
                  const bedPrice = bed.price_override || bed.sharingPrice || 0;
                    return (
                      <div
                        key={bed.id}
                        className={`relative rounded-lg border p-2 text-left transition-all hover:shadow-md ${statusColor}`}
                      >
                        {/* Header: bed number + status dot + action icons */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                            <span className="font-bold text-xs">#{bed.bed_number}</span>
                          </div>
                          <div className="flex items-center gap-0">
                            <button
                              className="p-0.5 rounded hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); handleGridBedClick(bed); }}
                              title="Edit bed"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button
                              className="p-0.5 rounded hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); requestDeleteBed(bed.id, bed.bed_number, bed.occupantName); }}
                              title="Delete bed"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                        {/* Bed shape icon */}
                        <div className="flex justify-center my-1">
                          <BedShapeIcon
                            width={40}
                            height={50}
                            status={isBlocked ? 'blocked' : !isAvail ? 'occupied' : 'available'}
                            bedNumber={bed.bed_number}
                            rotation={0}
                          />
                        </div>
                        {/* Badges */}
                        <div className="flex flex-wrap gap-0.5 mb-1">
                          {bed.category && <Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight">{bed.category}</Badge>}
                          {bed.sharingType && <Badge variant="secondary" className="text-[8px] px-1 py-0 leading-tight">{bed.sharingType}</Badge>}
                        </div>
                        {/* Price */}
                        <span className="text-[10px] font-semibold text-primary">{formatCurrency(bedPrice)}/mo</span>
                        {bed.occupantName && <span className="block text-[9px] text-muted-foreground truncate">👤 {bed.occupantName}</span>}
                      </div>
                    );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-[11px] pt-3 border-t mt-4">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-emerald-400 bg-emerald-50" /><span>Available</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-blue-400 bg-blue-50" /><span>Occupied</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-destructive/30 bg-destructive/10" /><span>Blocked</span></div>
              </div>
            </div>
          ) : selectedRoomId ? (
            <div className="text-center py-6 text-muted-foreground border rounded-lg">
              <BedDouble className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No beds in {selectedRoom?.room_number}</p>
              <p className="text-xs mt-1">Use "Add Beds" to create beds for this room</p>
            </div>
          ) : null}

          {/* ═══ Layout Plan for selected room ═══ */}
          {selectedRoomId && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <MapIcon className="h-4 w-4" />
                Layout Plan — {selectedRoom?.room_number}
              </h3>
              {roomLayout ? (
                <HostelBedPlanDesigner
                  roomId={selectedRoomId}
                  roomWidth={roomLayout?.room_width || 800}
                  roomHeight={roomLayout?.room_height || 600}
                  beds={designerBeds}
                  onBedsChange={setDesignerBeds}
                  onBedSelect={bed => {
                    setSelectedDesignerBed(bed);
                    if (bed) handleGridBedClick(bed);
                  }}
                  selectedBed={selectedDesignerBed}
                  onSave={handleSaveLayout}
                  onDeleteBed={handleDeleteDesignerBed}
                  onPlaceBed={handlePlaceBed}
                  onBedMove={handleBedMove}
                  onBedRotate={handleBedRotate}
                  layoutImage={layoutImage}
                  layoutImageOpacity={layoutImageOpacity}
                  onLayoutImageChange={setLayoutImage}
                  onLayoutImageOpacityChange={setLayoutImageOpacity}
                  isSaving={isSaving}
                  sharingOptions={sharingOptions}
                  categories={categories}
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  Loading layout...
                </div>
              )}
            </div>
          )}

          {!selectedRoomId && (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Select a room to view beds and layout plan</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No floors configured. Add floors in the Configuration panel above.</p>
        </div>
      )}

      {/* Edit Bed Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Bed #{editBed?.bed_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (₹/month)</Label>
              <Input type="number" value={editPriceOverride} onChange={e => setEditPriceOverride(e.target.value)} placeholder="Set bed price" className="mt-1" />
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AMENITY_OPTIONS.map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={editAmenities.includes(amenity)} onCheckedChange={() => toggleAmenity(amenity, editAmenities, setEditAmenities)} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setDetailsBedId(editBed?.id); setDetailsBedNumber(editBed?.bed_number || 0); setDetailsDialogOpen(true); }}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View Details
            </Button>
            <Button variant="destructive" size="sm" onClick={() => editBed && requestDeleteBed(editBed.id, editBed.bed_number, editBed.occupantName)} disabled={saving || editBed?.occupantName}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button size="sm" onClick={handleSaveBed} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Beds Dialog */}
      <Dialog open={addBedDialogOpen} onOpenChange={setAddBedDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Beds to {selectedRoom?.room_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sharing Type</Label>
              <Select value={addSharingOptionId} onValueChange={setAddSharingOptionId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sharing type" /></SelectTrigger>
                <SelectContent>
                  {addDialogSharingOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.type} ({s.capacity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={addCategory} onValueChange={setAddCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (₹/month)</Label>
              <Input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Bed price per month" className="mt-1" />
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AMENITY_OPTIONS.map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={addAmenities.includes(amenity)} onCheckedChange={() => toggleAmenity(amenity, addAmenities, setAddAmenities)} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Number of beds</Label>
              <Input type="number" min="1" max="50" value={addCount} onChange={e => setAddCount(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddBeds} disabled={saving || !addSharingOptionId}>Add Beds</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Floor</Label>
              <Select value={newRoomFloorId} onValueChange={setNewRoomFloorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select floor" /></SelectTrigger>
                <SelectContent>
                  {floors.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room Number / Name</Label>
              <Input value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} placeholder="e.g. 101 or Flat A" className="mt-1" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={newRoomDescription} onChange={e => setNewRoomDescription(e.target.value)} placeholder="Room description" className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">💡 Beds and pricing are configured after room creation.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleAddRoom} disabled={saving || !newRoomNumber.trim() || !newRoomFloorId}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'bed' && 'This bed will be permanently removed. This action cannot be undone.'}
              {deleteConfirm?.type === 'room' && 'This room will be deactivated. Existing bookings will be preserved.'}
              {deleteConfirm?.type === 'floor' && 'This floor will be permanently removed. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bed Details Dialog */}
      <HostelBedDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        bedId={detailsBedId}
        bedNumber={detailsBedNumber}
        hostelName={hostel?.name}
      />
    </div>
  );
};

export default HostelBedManagementPage;
