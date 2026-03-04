import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Save, ZoomIn, ZoomOut, Maximize, Image, X, MousePointerClick, Grid3X3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AutoSeatGenerator, GeneratedSeat } from './AutoSeatGenerator';

// ── Constants ──────────────────────────────────────────────────────
const GRID_SNAP = 40;
const SEAT_W = 36;
const SEAT_H = 26;
const snapToGrid = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;
const clampPosition = (x: number, y: number, roomW: number, roomH: number) => ({
  x: Math.max(SEAT_W / 2, Math.min(roomW - SEAT_W / 2, x)),
  y: Math.max(SEAT_H / 2, Math.min(roomH - SEAT_H / 2, y)),
});

// ── Types ──────────────────────────────────────────────────────────
export interface FloorPlanSeat {
  _id: string;
  id: string;
  number: number;
  cabinId: string;
  price: number;
  position: { x: number; y: number };
  isAvailable: boolean;
  unavailableUntil?: string;
  rowIndex?: number;
  colIndex?: number;
  sectionId?: string;
  category?: string;
}

export interface SeatCategoryOption {
  id: string;
  name: string;
  price: number;
}

interface FloorPlanDesignerProps {
  cabinId: string;
  roomWidth: number;
  roomHeight: number;
  seats: FloorPlanSeat[];
  onSeatsChange: (seats: FloorPlanSeat[]) => void;
  onSeatSelect: (seat: FloorPlanSeat | null) => void;
  selectedSeat: FloorPlanSeat | null;
  onSave: () => void;
  onDeleteSeat?: (seatId: string) => void;
  onPlaceSeat?: (position: { x: number; y: number }, number: number, price: number, category: string) => void;
  onSeatMove?: (seatId: string, position: { x: number; y: number }) => void;
  onSeatUpdate?: (seatId: string, updates: { category?: string; price?: number }) => void;
  layoutImage?: string | null;
  layoutImageOpacity?: number;
  onLayoutImageChange?: (image: string | null) => void;
  onLayoutImageOpacityChange?: (opacity: number) => void;
  isSaving?: boolean;
  categories?: SeatCategoryOption[];
  minPrice?: number;
  onRoomResize?: (newWidth: number, newHeight: number) => void;
  onBulkPlaceSeats?: (seats: Array<{ position: { x: number; y: number }; number: number; price: number; category: string }>) => Promise<void>;
  onBulkMoveSeats?: (seats: Array<{ _id: string; position: { x: number; y: number } }>) => Promise<void>;
  onDeleteAllSeats?: () => Promise<void>;
}

export const FloorPlanDesigner: React.FC<FloorPlanDesignerProps> = ({
  cabinId,
  roomWidth,
  roomHeight,
  seats,
  onSeatsChange,
  onSeatSelect,
  selectedSeat,
  onSave,
  onDeleteSeat,
  onPlaceSeat,
  onSeatMove,
  onSeatUpdate,
  layoutImage,
  layoutImageOpacity = 30,
  onLayoutImageChange,
  onLayoutImageOpacityChange,
  isSaving,
  categories = [],
  minPrice = 0,
  onRoomResize,
  onBulkPlaceSeats,
  onBulkMoveSeats,
  onDeleteAllSeats,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Placement mode
  const [placementMode, setPlacementMode] = useState(false);
  const [nextSeatNumber, setNextSeatNumber] = useState(1);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Pending seat for dialog
  const [pendingSeat, setPendingSeat] = useState<{ x: number; y: number } | null>(null);

  // Dragging state
  const [draggingSeatId, setDraggingSeatId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Edit dialog
  const [editingSeat, setEditingSeat] = useState<FloorPlanSeat | null>(null);

  // Update nextSeatNumber when seats change
  useEffect(() => {
    if (seats.length > 0) {
      const maxNum = Math.max(...seats.map(s => s.number));
      setNextSeatNumber(maxNum + 1);
    } else {
      setNextSeatNumber(1);
    }
  }, [seats.length]);

  // ── Canvas coordinate helpers ──
  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Canvas mouse handlers ──
  // ── Overlap detection ──
  const isOverlapping = useCallback((pos: { x: number; y: number }, excludeId?: string) =>
    seats.some(s => s._id !== excludeId &&
      Math.abs(s.position.x - pos.x) < SEAT_W &&
      Math.abs(s.position.y - pos.y) < SEAT_H
    ), [seats]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (placementMode && onPlaceSeat) {
      const pos = getCanvasPos(e);
      if (pos.x >= 0 && pos.y >= 0 && pos.x <= roomWidth && pos.y <= roomHeight) {
        const clamped = clampPosition(snapToGrid(pos.x), snapToGrid(pos.y), roomWidth, roomHeight);
        if (isOverlapping(clamped)) {
          toast({ title: "A seat already exists at this position", variant: "destructive" });
          return;
        }
        setPendingSeat(clamped);
      }
      return;
    }

    if (!draggingSeatId) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingSeatId) {
      const pos = getCanvasPos(e);
      const rawX = snapToGrid(pos.x - dragOffset.x);
      const rawY = snapToGrid(pos.y - dragOffset.y);
      const { x: newX, y: newY } = clampPosition(rawX, rawY, roomWidth, roomHeight);
      // Prevent dropping on another seat
      if (!isOverlapping({ x: newX, y: newY }, draggingSeatId)) {
        onSeatsChange(seats.map(s =>
          s._id === draggingSeatId ? { ...s, position: { x: newX, y: newY } } : s
        ));
      }
      return;
    }
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (draggingSeatId) {
      const dist = Math.abs(e.clientX - dragStartPos.x) + Math.abs(e.clientY - dragStartPos.y);
      const seat = seats.find(s => s._id === draggingSeatId);
      if (dist < 5 && seat) {
        // It was a click, not a drag — open edit dialog
        setEditingSeat(seat);
      } else if (seat && onSeatMove) {
        onSeatMove(seat._id, seat.position);
      }
      setDraggingSeatId(null);
      return;
    }
    setIsPanning(false);
  };

  useEffect(() => {
    const handler = () => {
      if (draggingSeatId) {
        const seat = seats.find(s => s._id === draggingSeatId);
        if (seat && onSeatMove) onSeatMove(seat._id, seat.position);
        setDraggingSeatId(null);
      }
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [draggingSeatId, seats, onSeatMove]);

  // ── Seat drag start ──
  const handleSeatMouseDown = (e: React.MouseEvent, seat: FloorPlanSeat) => {
    if (placementMode) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);
    setDragOffset({ x: pos.x - seat.position.x, y: pos.y - seat.position.y });
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggingSeatId(seat._id);
  };

  // ── Layout image upload ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onLayoutImageChange) return;
    const reader = new FileReader();
    reader.onload = () => onLayoutImageChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Zoom ──
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const handleFitToScreen = () => {
    if (!canvasRef.current?.parentElement) return;
    const container = canvasRef.current.parentElement;
    const scaleX = (container.clientWidth - 40) / roomWidth;
    const scaleY = (container.clientHeight - 40) / roomHeight;
    setZoom(Math.min(scaleX, scaleY, 1.5));
    setPan({ x: 20, y: 20 });
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.25, Math.min(z + (e.deltaY > 0 ? -0.1 : 0.1), 3)));
  };

  // ── Seat placement confirm ──
  const handlePlacementConfirm = (number: number, category: string, price: number) => {
    if (pendingSeat && onPlaceSeat) {
      onPlaceSeat(pendingSeat, number, price, category);
      setNextSeatNumber(number + 1);
    }
    setPendingSeat(null);
  };

  // ── Auto-generate seats handler ──
  const handleAutoGenerate = async (generatedSeats: GeneratedSeat[]) => {
    // Filter out overlapping seats
    const validSeats = generatedSeats.filter(gs => !isOverlapping(gs.position));
    const skipped = generatedSeats.length - validSeats.length;

    if (validSeats.length === 0) {
      toast({ title: 'No seats placed', description: 'All positions overlapped with existing seats' });
      return;
    }

    // Auto-expand room if seats exceed current bounds
    const maxX = Math.max(...validSeats.map(s => s.position.x)) + SEAT_W + GRID_SNAP;
    const maxY = Math.max(...validSeats.map(s => s.position.y)) + SEAT_H + GRID_SNAP;
    if ((maxX > roomWidth || maxY > roomHeight) && onRoomResize) {
      onRoomResize(Math.max(roomWidth, maxX), Math.max(roomHeight, maxY));
    }

    // Use bulk placement if available (single API call)
    if (onBulkPlaceSeats) {
      const bulkData = validSeats.map(gs => ({
        position: gs.position,
        number: gs.number,
        price: gs.price,
        category: categories[0]?.name || 'Non-AC',
      }));
      await onBulkPlaceSeats(bulkData);
    } else if (onPlaceSeat) {
      for (const gs of validSeats) {
        onPlaceSeat(gs.position, gs.number, gs.price, categories[0]?.name || 'Non-AC');
      }
    }

    toast({ title: `Placed ${validSeats.length} seats`, description: skipped > 0 ? `${skipped} skipped due to overlap` : undefined });
    setTimeout(() => handleFitToScreen(), 300);
  };

  // ── Reset Layout: re-grid all seats in neat rows ──
  const handleResetLayout = async () => {
    if (seats.length === 0) return;
    const sorted = [...seats].sort((a, b) => a.number - b.number);
    const cols = Math.ceil(Math.sqrt(sorted.length * 1.5));
    const spacingX = SEAT_W + 6;
    const spacingY = SEAT_H + 6;
    const startX = 60;
    const startY = 60;

    const updates: Array<{ _id: string; position: { x: number; y: number } }> = [];
    sorted.forEach((seat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;
      updates.push({ _id: seat._id, position: { x, y } });
    });

    // Auto-expand if needed
    const maxX = Math.max(...updates.map(u => u.position.x)) + SEAT_W + GRID_SNAP;
    const maxY = Math.max(...updates.map(u => u.position.y)) + SEAT_H + GRID_SNAP;
    if ((maxX > roomWidth || maxY > roomHeight) && onRoomResize) {
      onRoomResize(Math.max(roomWidth, maxX), Math.max(roomHeight, maxY));
    }

    // Update local state immediately
    const posMap = new Map(updates.map(u => [u._id, u.position]));
    onSeatsChange(seats.map(s => posMap.has(s._id) ? { ...s, position: posMap.get(s._id)! } : s));

    // Persist via bulk move
    if (onBulkMoveSeats) {
      await onBulkMoveSeats(updates);
    }

    toast({ title: 'Layout reset', description: `${sorted.length} seats arranged in grid` });
    setTimeout(() => handleFitToScreen(), 300);
  };

  // ── Seat edit confirm ──
  const handleEditConfirm = (updates: { category?: string; price?: number }) => {
    if (editingSeat && onSeatUpdate) {
      onSeatUpdate(editingSeat._id, updates);
      // Update local state
      setSeatsLocal(editingSeat._id, updates);
    }
    setEditingSeat(null);
  };

  const setSeatsLocal = (seatId: string, updates: { category?: string; price?: number }) => {
    onSeatsChange(seats.map(s => s._id === seatId ? { ...s, ...updates } : s));
  };

  const defaultCategory = categories.length > 0 ? categories[0] : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {layoutImage ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Opacity:</Label>
              <Slider
                className="w-20"
                min={5} max={80} step={5}
                value={[layoutImageOpacity]}
                onValueChange={([v]) => onLayoutImageOpacityChange?.(v)}
              />
              <span className="text-xs w-8">{layoutImageOpacity}%</span>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={() => onLayoutImageChange?.(null)}>
              <X className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()}>
            <Image className="h-3.5 w-3.5 mr-1" /> Upload Layout
          </Button>
        )}

        <div className="h-6 w-px bg-border" />

        <Button
          variant={placementMode ? 'default' : 'outline'}
          size="sm"
          className="h-8"
          onClick={() => setPlacementMode(!placementMode)}
        >
          <MousePointerClick className="h-3.5 w-3.5 mr-1" /> {placementMode ? 'Stop Placing' : 'Place Seats'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setShowAutoGenerator(true)}
        >
          <Grid3X3 className="h-3.5 w-3.5 mr-1" /> Add Multiple
        </Button>

        {seats.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleResetLayout}
          >
            <Maximize className="h-3.5 w-3.5 mr-1" /> Reset Layout
          </Button>
        )}

        {seats.length > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
            {seats.length} Seats
          </span>
        )}

        {seats.length > 0 && onDeleteAllSeats && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={() => setShowDeleteAllConfirm(true)}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Delete All
          </Button>
        )}

        {placementMode && (
          <span className="text-xs text-muted-foreground">Next: #{nextSeatNumber} — Click on the layout to place a seat</span>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleFitToScreen}><Maximize className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button size="sm" className="h-8" onClick={onSave} disabled={isSaving}>
          <Save className="h-3.5 w-3.5 mr-1" /> {isSaving ? 'Saving...' : 'Save Layout'}
        </Button>
      </div>

      {/* Canvas */}
      <div
        className="relative overflow-hidden border rounded-lg bg-muted/30"
        style={{
          height: '600px',
          cursor: placementMode ? 'crosshair' : draggingSeatId ? 'grabbing' : (isPanning ? 'grabbing' : 'grab'),
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={placementMode ? handleWheel : undefined}
      >
        <div
          ref={canvasRef}
          className="absolute bg-background rounded shadow-sm"
          style={{
            width: roomWidth,
            height: roomHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {layoutImage && (
            <img
              src={layoutImage}
              alt="Layout background"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ opacity: layoutImageOpacity / 100, zIndex: 0 }}
            />
          )}

          {seats.map(seat => {
            const isSelected = selectedSeat?._id === seat._id;
            const isBooked = !seat.isAvailable;
            const isDragging = draggingSeatId === seat._id;

            let seatClass = 'bg-emerald-50 border-emerald-400 text-emerald-800';
            if (isSelected) seatClass = 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/50';
            else if (isBooked) seatClass = 'bg-muted border-muted-foreground/30 text-muted-foreground';

            return (
              <div key={seat._id} className="group absolute" style={{
                left: seat.position.x - 18,
                top: seat.position.y - 13,
                zIndex: isDragging ? 30 : isSelected ? 20 : 5,
                cursor: placementMode ? 'crosshair' : 'move',
              }}>
                <button
                  className={`flex items-center justify-center rounded border text-[10px] font-bold select-none transition-all ${seatClass} ${isDragging ? 'shadow-lg scale-110' : ''}`}
                  style={{ width: 36, height: 26 }}
                  onMouseDown={e => handleSeatMouseDown(e, seat)}
                >
                  {seat.number}
                </button>
                {onDeleteSeat && !isDragging && (
                  <button
                    className="absolute -top-2 -right-2 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px]"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteSeat(seat._id);
                    }}
                    title="Delete seat"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border border-emerald-400 bg-emerald-50" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border border-primary bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded border border-muted-foreground/30 bg-muted" />
          <span>Booked/Blocked</span>
        </div>
      </div>

      {/* Seat Placement Dialog */}
      <SeatPlacementDialog
        open={!!pendingSeat}
        defaultNumber={nextSeatNumber}
        defaultPrice={defaultCategory?.price ?? 2000}
        categories={categories}
        minPrice={minPrice}
        onConfirm={handlePlacementConfirm}
        onCancel={() => setPendingSeat(null)}
      />

      {/* Seat Edit Dialog */}
      <SeatEditDialog
        open={!!editingSeat}
        seat={editingSeat}
        categories={categories}
        minPrice={minPrice}
        onConfirm={handleEditConfirm}
        onCancel={() => setEditingSeat(null)}
        onDelete={onDeleteSeat}
      />

      {/* Auto Seat Generator */}
      <AutoSeatGenerator
        open={showAutoGenerator}
        onOpenChange={setShowAutoGenerator}
        onGenerate={handleAutoGenerate}
        roomWidth={roomWidth}
        roomHeight={roomHeight}
        gridSize={GRID_SNAP}
        existingSeatCount={seats.length}
      />

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Seats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {seats.length} seats on this floor. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (onDeleteAllSeats) await onDeleteAllSeats();
                setShowDeleteAllConfirm(false);
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Seat Placement Dialog ──────────────────────────────────────────
interface SeatPlacementDialogProps {
  open: boolean;
  defaultNumber: number;
  defaultPrice: number;
  categories: SeatCategoryOption[];
  minPrice?: number;
  onConfirm: (number: number, category: string, price: number) => void;
  onCancel: () => void;
}

const SeatPlacementDialog: React.FC<SeatPlacementDialogProps> = ({
  open, defaultNumber, defaultPrice, categories, minPrice = 0, onConfirm, onCancel,
}) => {
  const [seatNumber, setSeatNumber] = useState(defaultNumber);
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(defaultPrice);

  useEffect(() => {
    if (open) {
      setSeatNumber(defaultNumber);
      const defaultCat = categories.length > 0 ? categories[0].name : 'Non-AC';
      setCategory(defaultCat);
      const catPrice = categories.find(c => c.name === defaultCat)?.price;
      setPrice(catPrice ?? defaultPrice);
    }
  }, [open, defaultNumber, defaultPrice, categories]);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = categories.find(c => c.name === catName);
    if (cat) setPrice(cat.price);
  };

  const categoryList = categories.length > 0 ? categories : [
    { id: '1', name: 'Non-AC', price: defaultPrice },
  ];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Place Seat</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Seat Number</Label>
            <Input type="number" min={1} value={seatNumber} onChange={e => setSeatNumber(+e.target.value || 1)} />
          </div>
          <div>
            <Label>Category</Label>
            <RadioGroup value={category} onValueChange={handleCategoryChange} className="flex flex-wrap gap-3 mt-2">
              {categoryList.map(cat => (
                <div key={cat.id || cat.name} className="flex items-center space-x-1.5">
                  <RadioGroupItem value={cat.name} id={`cat-${cat.name}`} />
                  <Label htmlFor={`cat-${cat.name}`} className="text-sm cursor-pointer">
                    {cat.name} (₹{cat.price})
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label>Price (₹/month)</Label>
            <Input type="number" min={minPrice} value={price} onChange={e => setPrice(+e.target.value || 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => { if (price < minPrice) return; onConfirm(seatNumber, category, price); }}>Place Seat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Seat Edit Dialog ───────────────────────────────────────────────
interface SeatEditDialogProps {
  open: boolean;
  seat: FloorPlanSeat | null;
  categories: SeatCategoryOption[];
  minPrice?: number;
  onConfirm: (updates: { category?: string; price?: number }) => void;
  onCancel: () => void;
  onDelete?: (seatId: string) => void;
}

const SeatEditDialog: React.FC<SeatEditDialogProps> = ({
  open, seat, categories, minPrice = 0, onConfirm, onCancel, onDelete,
}) => {
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (open && seat) {
      setCategory(seat.category || 'Non-AC');
      setPrice(seat.price);
    }
  }, [open, seat]);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = categories.find(c => c.name === catName);
    if (cat) setPrice(cat.price);
  };

  const categoryList = categories.length > 0 ? categories : [
    { id: '1', name: 'Non-AC', price: 2000 },
  ];

  if (!seat) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Seat #{seat.number}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Category</Label>
            <RadioGroup value={category} onValueChange={handleCategoryChange} className="flex flex-wrap gap-3 mt-2">
              {categoryList.map(cat => (
                <div key={cat.id || cat.name} className="flex items-center space-x-1.5">
                  <RadioGroupItem value={cat.name} id={`edit-cat-${cat.name}`} />
                  <Label htmlFor={`edit-cat-${cat.name}`} className="text-sm cursor-pointer">
                    {cat.name} (₹{cat.price})
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label>Price (₹/month)</Label>
            <Input type="number" min={minPrice} value={price} onChange={e => setPrice(+e.target.value || 0)} />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(seat._id); onCancel(); }}>
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => { if (price < minPrice) return; onConfirm({ category, price }); }}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
