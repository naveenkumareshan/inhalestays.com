import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { adminCabinsService } from "@/api/adminCabinsService";
import { cabinsService } from "@/api/cabinsService";
import { adminSeatsService, SeatData } from "@/api/adminSeatsService";
import { seatCategoryService, SeatCategory } from "@/api/seatCategoryService";
import { isUUID } from "@/utils/idUtils";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { FloorPlanDesigner, FloorPlanSeat } from "@/components/seats/FloorPlanDesigner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const SeatManagement = () => {
  const { cabinId } = useParams<{ cabinId: string }>();
  const navigate = useNavigate();

  const [cabin, setCabin] = useState<any>(null);
  const [seats, setSeats] = useState<FloorPlanSeat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<FloorPlanSeat | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutImage, setLayoutImage] = useState<string | null>(null);
  const [layoutImageOpacity, setLayoutImageOpacity] = useState(30);

  const [roomWidth, setRoomWidth] = useState(800);
  const [roomHeight, setRoomHeight] = useState(600);

  // Floors
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [floorNumber, setFloorNumber] = useState("");
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [showAddFloorForm, setShowAddFloorForm] = useState(false);

  // Categories
  const [categories, setCategories] = useState<SeatCategory[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SeatCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catPrice, setCatPrice] = useState(0);

  useEffect(() => {
    if (cabinId) {
      fetchCabinData(cabinId);
    }
  }, [cabinId]);

  useEffect(() => {
    if (cabin?.id && selectedFloor) fetchSeats(cabin.id, selectedFloor);
  }, [selectedFloor, cabin?.id]);

  const fetchCabinData = async (id: string) => {
    try {
      setLoading(true);
      // Resolve serial number to UUID if needed
      let resolvedId = id;
      if (!isUUID(id)) {
        const snRes = await cabinsService.getCabinBySerialNumber(id);
        if (snRes.success && snRes.data) {
          resolvedId = snRes.data.id;
        }
      }
      const res = await adminCabinsService.getCabinById(resolvedId);
      if (res.success) {
        const d = res.data;
        setCabin(d);
        const floorsList = Array.isArray(d.floors) ? d.floors : [];
        setFloors(floorsList);
        setRoomWidth(d.room_width || 800);
        setRoomHeight(d.room_height || 600);
        // Load per-floor layout image for the selected floor
        const currentFloor = floorsList.find((f: any) => f.id === selectedFloor);
        if (currentFloor?.layout_image) {
          setLayoutImage(currentFloor.layout_image);
          setLayoutImageOpacity(currentFloor.layout_image_opacity ?? 30);
        } else {
          setLayoutImage(d.layout_image || null);
        }
        // Fetch seats and categories using the resolved UUID
        fetchSeats(resolvedId, selectedFloor);
        fetchCategories(resolvedId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeats = async (id: string, floor: number) => {
    try {
      setLoading(true);
      const res = await adminSeatsService.getSeatsByCabin(id, floor.toString());
      if (res.success) setSeats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (id: string) => {
    const res = await seatCategoryService.getCategories(id);
    if (res.success) setCategories(res.data);
  };

  // When floor changes, load that floor's layout image
  useEffect(() => {
    if (floors.length > 0) {
      const currentFloor = floors.find((f: any) => f.id === selectedFloor);
      if (currentFloor?.layout_image) {
        setLayoutImage(currentFloor.layout_image);
        setLayoutImageOpacity(currentFloor.layout_image_opacity ?? 30);
      } else if (cabin) {
        setLayoutImage(cabin.layout_image || null);
        setLayoutImageOpacity(30);
      }
    }
  }, [selectedFloor, floors]);

  const handleSave = async () => {
    if (!cabin?.id) return;
    setIsSaving(true);
    try {
      // Save per-floor layout image into floors JSONB
      const updatedFloors = floors.map((f: any) =>
        f.id === selectedFloor
          ? { ...f, layout_image: layoutImage, layout_image_opacity: layoutImageOpacity }
          : f
      );
      setFloors(updatedFloors);

      await adminCabinsService.updateCabinLayout(cabin.id, [], roomWidth, roomHeight, 20, [], undefined, updatedFloors);
      const seatsToUpdate = seats.map(s => ({ _id: s._id, position: s.position }));
      await adminSeatsService.updateSeatPositions(seatsToUpdate);
      // Update local cabin state with new floors so floor switches use correct data
      setCabin((prev: any) => prev ? { ...prev, floors: updatedFloors } : prev);
      toast({ title: "Layout saved successfully" });
    } catch (e) {
      toast({ title: "Error saving layout", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSeat = async (seatId: string) => {
    try {
      await adminSeatsService.deleteSeat(seatId);
      setSeats(prev => prev.filter(s => s._id !== seatId));
      if (selectedSeat?._id === seatId) setSelectedSeat(null);
      toast({ title: "Seat deleted" });
    } catch (e) {
      toast({ title: "Error deleting seat", variant: "destructive" });
    }
  };

  const handlePlaceSeat = async (position: { x: number; y: number }, number: number, price: number, category: string) => {
    if (!cabin?.id) return;
    try {
      const seatData: SeatData = {
        number, floor: selectedFloor, cabinId: cabin.id, price, position,
        isAvailable: true, category,
      };
      const res = await adminSeatsService.createSeat(seatData);
      if (res.success && res.data) {
        setSeats(prev => [...prev, res.data]);
        toast({ title: `Seat #${number} (${category}) placed` });
      }
    } catch (e) {
      toast({ title: "Error placing seat", variant: "destructive" });
    }
  };

  const handleSeatMove = async (seatId: string, position: { x: number; y: number }) => {
    try {
      await adminSeatsService.updateSeatPositions([{ _id: seatId, position }]);
    } catch (e) {
      console.error('Error saving seat position:', e);
    }
  };

  const handleSeatUpdate = async (seatId: string, updates: { category?: string; price?: number }) => {
    try {
      const res = await adminSeatsService.updateSeat(seatId, updates);
      if (res.success) {
        setSeats(seats.map(s => s._id === seatId ? { ...s, ...updates } : s));
        toast({ title: "Seat updated" });

        // Sync price to category if changed
        if (updates.price !== undefined && updates.category && cabin?.id) {
          const matchingCat = categories.find(c => c.name === updates.category);
          if (matchingCat && matchingCat.price !== updates.price) {
            await seatCategoryService.updateCategory(matchingCat.id, { price: updates.price });
            fetchCategories(cabin.id);
          }
        }
      }
    } catch (e) {
      toast({ title: "Error updating seat", variant: "destructive" });
    }
  };

  const handleAddOrUpdateFloor = async () => {
    if (!floorNumber || !cabin) return;
    try {
      const res = await adminCabinsService.addUpdateCabinFloor(cabin.id, {
        floorId: editingFloorId, number: floorNumber,
      });
      if (res.success) {
        setFloors(res.data.floors);
        toast({ title: editingFloorId ? "Floor updated" : "Floor added" });
        setFloorNumber(""); setEditingFloorId(null); setShowAddFloorForm(false);
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // ── Category CRUD ──
  const openAddCategory = () => {
    setEditingCategory(null); setCatName(""); setCatPrice(0); setShowCategoryDialog(true);
  };
  const openEditCategory = (cat: SeatCategory) => {
    setEditingCategory(cat); setCatName(cat.name); setCatPrice(cat.price); setShowCategoryDialog(true);
  };
  const handleSaveCategory = async () => {
    if (!catName.trim() || !cabin?.id) return;
    const minPrice = cabin?.price || 0;
    if (catPrice < minPrice) {
      toast({ title: `Price cannot be below starting price ₹${minPrice}`, variant: "destructive" });
      return;
    }
    if (editingCategory) {
      const res = await seatCategoryService.updateCategory(editingCategory.id, { name: catName, price: catPrice });
      if (res.success) {
        toast({ title: "Category updated" });
        fetchCategories(cabin.id);
      }
    } else {
      const res = await seatCategoryService.createCategory(cabin.id, catName, catPrice);
      if (res.success) {
        toast({ title: "Category added" });
        fetchCategories(cabin.id);
      }
    }
    setShowCategoryDialog(false);
  };
  const handleDeleteCategory = async (id: string) => {
    if (!cabin?.id) return;
    const res = await seatCategoryService.deleteCategory(id);
    if (res.success) {
      toast({ title: "Category deleted" });
      fetchCategories(cabin.id);
    }
  };

  if (loading && !cabin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-3">
      {/* Slim header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold">{cabin?.name}</h1>
          <span className="text-xs text-muted-foreground">
            {cabin?.category} • {cabin?.capacity} cap • ₹{cabin?.price}/mo
          </span>
        </div>
      </div>

      {/* Combined Categories + Floors row */}
      <div className="border rounded-lg p-3 flex flex-col lg:flex-row gap-3">
        {/* Categories section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Categories</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openAddCategory}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 border rounded px-2 py-1 text-xs">
                <span className="font-medium">{cat.name}</span>
                <span className="text-muted-foreground">₹{cat.price}</span>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditCategory(cat)}>
                  <Pencil className="h-2.5 w-2.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && <span className="text-xs text-muted-foreground">No categories yet</span>}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border" />

        {/* Floors section */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Floors</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setFloorNumber(""); setEditingFloorId(null); setShowAddFloorForm(true); }}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {floors.map((floor: any) => (
              <button
                key={floor.id}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedFloor === floor.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                }`}
                onClick={() => setSelectedFloor(floor.id)}
                onDoubleClick={() => { setFloorNumber(floor.number.toString()); setEditingFloorId(floor.id); setShowAddFloorForm(true); }}
              >
                Floor {floor.number}
              </button>
            ))}
          </div>
          {showAddFloorForm && (
            <div className="flex items-center gap-2 mt-2">
              <Input type="number" min={1} value={floorNumber} onChange={e => setFloorNumber(e.target.value)} className="w-20 h-7 text-xs" placeholder="#" />
              <Button size="sm" className="h-7 text-xs" onClick={handleAddOrUpdateFloor} disabled={!floorNumber}>
                {editingFloorId ? "Update" : "Add"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddFloorForm(false); setFloorNumber(""); }}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {/* Floor Plan Designer - no card wrapper */}
      <FloorPlanDesigner
        cabinId={cabin?.id || ""}
        roomWidth={roomWidth}
        roomHeight={roomHeight}
        seats={seats}
        onSeatsChange={setSeats}
        onSeatSelect={seat => { setSelectedSeat(seat); }}
        selectedSeat={selectedSeat}
        onSave={handleSave}
        onDeleteSeat={handleDeleteSeat}
        onPlaceSeat={handlePlaceSeat}
        onSeatMove={handleSeatMove}
        onSeatUpdate={handleSeatUpdate}
        layoutImage={layoutImage}
        layoutImageOpacity={layoutImageOpacity}
        onLayoutImageChange={setLayoutImage}
        onLayoutImageOpacityChange={setLayoutImageOpacity}
        isSaving={isSaving}
        categories={categories.map(c => ({ id: c.id, name: c.name, price: c.price }))}
        minPrice={cabin?.price || 0}
      />

      {/* Category Management Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Category Name</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. AC, Premium" />
            </div>
            <div>
              <Label>Default Price (₹/month)</Label>
              <Input type="number" min={cabin?.price || 0} value={catPrice} onChange={e => setCatPrice(+e.target.value || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!catName.trim()}>
              {editingCategory ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeatManagement;
