import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ZoomIn, ZoomOut, Maximize, Image, X, MousePointerClick, RotateCw, Grid3X3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BedShapeIcon } from '@/components/hostels/BedShapeIcon';

const GRID_SNAP = 40;
const BED_W = 50;
const BED_H = 62;
const snapToGrid = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;
const clampPosition = (x: number, y: number, roomW: number, roomH: number) => ({
  x: Math.max(BED_W / 2, Math.min(roomW - BED_W / 2, x)),
  y: Math.max(BED_H / 2, Math.min(roomH - BED_H / 2, y)),
});

export interface DesignerBed {
  id: string;
  bed_number: number;
  position_x: number;
  position_y: number;
  is_available: boolean;
  is_blocked: boolean;
  category: string | null;
  price_override: number | null;
  sharing_option_id: string;
  sharingType?: string;
  sharingPrice?: number;
  occupantName?: string;
  rotation?: number;
}

interface HostelBedPlanDesignerProps {
  roomId: string;
  roomWidth: number;
  roomHeight: number;
  beds: DesignerBed[];
  onBedsChange: (beds: DesignerBed[]) => void;
  onBedSelect: (bed: DesignerBed | null) => void;
  selectedBed: DesignerBed | null;
  onSave: () => void;
  onDeleteBed?: (bedId: string) => void;
  onPlaceBed?: (position: { x: number; y: number }, number: number, sharingOptionId: string, category: string) => void;
  onBedMove?: (bedId: string, position: { x: number; y: number }) => void;
  onBedRotate?: (bedId: string, rotation: number) => void;
  layoutImage?: string | null;
  layoutImageOpacity?: number;
  onLayoutImageChange?: (image: string | null) => void;
  onLayoutImageOpacityChange?: (opacity: number) => void;
  isSaving?: boolean;
  sharingOptions?: { id: string; type: string; price_monthly: number }[];
  categories?: { id: string; name: string; price_adjustment: number }[];
}

export const HostelBedPlanDesigner: React.FC<HostelBedPlanDesignerProps> = ({
  roomId, roomWidth, roomHeight, beds, onBedsChange, onBedSelect, selectedBed,
  onSave, onDeleteBed, onPlaceBed, onBedMove, onBedRotate, layoutImage, layoutImageOpacity = 30,
  onLayoutImageChange, onLayoutImageOpacityChange, isSaving, sharingOptions = [], categories = [],
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [placementMode, setPlacementMode] = useState(false);
  const [nextBedNumber, setNextBedNumber] = useState(1);
  const [pendingBed, setPendingBed] = useState<{ x: number; y: number } | null>(null);
  const [draggingBedId, setDraggingBedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Placement dialog state
  const [placeSharingOption, setPlaceSharingOption] = useState('');
  const [placeCategory, setPlaceCategory] = useState('');
  const [placeBedNumber, setPlaceBedNumber] = useState(1);

  // Multi-bed dialog state
  const [showMultiBedDialog, setShowMultiBedDialog] = useState(false);
  const [multiBedCount, setMultiBedCount] = useState(5);
  const [multiBedSharing, setMultiBedSharing] = useState('');
  const [multiBedCategory, setMultiBedCategory] = useState('');

  useEffect(() => {
    if (beds.length > 0) {
      setNextBedNumber(Math.max(...beds.map(b => b.bed_number)) + 1);
    } else {
      setNextBedNumber(1);
    }
  }, [beds.length]);

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const isOverlapping = useCallback((pos: { x: number; y: number }, excludeId?: string) =>
    beds.some(b => b.id !== excludeId &&
      Math.abs(b.position_x - pos.x) < BED_W &&
      Math.abs(b.position_y - pos.y) < BED_H
    ), [beds]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (placementMode && onPlaceBed) {
      const pos = getCanvasPos(e);
      if (pos.x >= 0 && pos.y >= 0 && pos.x <= roomWidth && pos.y <= roomHeight) {
        const clamped = clampPosition(snapToGrid(pos.x), snapToGrid(pos.y), roomWidth, roomHeight);
        if (isOverlapping(clamped)) {
          toast({ title: "A bed already exists at this position", variant: "destructive" });
          return;
        }
        setPendingBed(clamped);
        setPlaceBedNumber(nextBedNumber);
        setPlaceSharingOption(sharingOptions[0]?.id || '');
        setPlaceCategory('');
      }
      return;
    }
    if (!draggingBedId) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingBedId) {
      const pos = getCanvasPos(e);
      const rawX = snapToGrid(pos.x - dragOffset.x);
      const rawY = snapToGrid(pos.y - dragOffset.y);
      const { x: newX, y: newY } = clampPosition(rawX, rawY, roomWidth, roomHeight);
      if (!isOverlapping({ x: newX, y: newY }, draggingBedId)) {
        onBedsChange(beds.map(b =>
          b.id === draggingBedId ? { ...b, position_x: newX, position_y: newY } : b
        ));
      }
      return;
    }
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (draggingBedId) {
      const dist = Math.abs(e.clientX - dragStartPos.x) + Math.abs(e.clientY - dragStartPos.y);
      const bed = beds.find(b => b.id === draggingBedId);
      if (dist < 5 && bed) {
        onBedSelect(bed);
      } else if (bed && onBedMove) {
        onBedMove(bed.id, { x: bed.position_x, y: bed.position_y });
      }
      setDraggingBedId(null);
      return;
    }
    setIsPanning(false);
  };

  useEffect(() => {
    const handler = () => {
      if (draggingBedId) {
        const bed = beds.find(b => b.id === draggingBedId);
        if (bed && onBedMove) onBedMove(bed.id, { x: bed.position_x, y: bed.position_y });
        setDraggingBedId(null);
      }
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [draggingBedId, beds, onBedMove]);

  const handleBedMouseDown = (e: React.MouseEvent, bed: DesignerBed) => {
    if (placementMode) return;
    e.stopPropagation();
    const pos = getCanvasPos(e);
    setDragOffset({ x: pos.x - bed.position_x, y: pos.y - bed.position_y });
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggingBedId(bed.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onLayoutImageChange) return;
    const reader = new FileReader();
    reader.onload = () => onLayoutImageChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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

  const handlePlacementConfirm = () => {
    if (pendingBed && onPlaceBed && placeSharingOption) {
      onPlaceBed(pendingBed, placeBedNumber, placeSharingOption, placeCategory);
      setNextBedNumber(placeBedNumber + 1);
    }
    setPendingBed(null);
  };

  const handleMultiBedGenerate = () => {
    if (!onPlaceBed || !multiBedSharing) return;
    const spacing = 60;
    const startX = snapToGrid(Math.max(GRID_SNAP * 2, 60));
    const startY = snapToGrid(Math.max(GRID_SNAP * 3, 100));
    const cols = Math.floor((roomWidth - startX * 2) / spacing) || 1;
    let placed = 0;
    let num = nextBedNumber;

    for (let i = 0; i < multiBedCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const pos = clampPosition(
        snapToGrid(startX + col * spacing),
        snapToGrid(startY + row * spacing),
        roomWidth, roomHeight
      );
      if (!isOverlapping(pos)) {
        onPlaceBed(pos, num, multiBedSharing, multiBedCategory === 'none' ? '' : multiBedCategory);
        placed++;
        num++;
      }
    }
    setNextBedNumber(num);
    setShowMultiBedDialog(false);
    toast({ title: `Placed ${placed} beds`, description: `${multiBedCount - placed} skipped due to overlap` });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {layoutImage ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Opacity:</Label>
              <Slider className="w-20" min={5} max={80} step={5} value={[layoutImageOpacity]} onValueChange={([v]) => onLayoutImageOpacityChange?.(v)} />
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
        <Button variant={placementMode ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setPlacementMode(!placementMode)}>
          <MousePointerClick className="h-3.5 w-3.5 mr-1" /> {placementMode ? 'Stop Placing' : 'Place Beds'}
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => { setMultiBedSharing(sharingOptions[0]?.id || ''); setMultiBedCategory(''); setShowMultiBedDialog(true); }}>
          <Grid3X3 className="h-3.5 w-3.5 mr-1" /> Add Multiple
        </Button>
        {placementMode && <span className="text-xs text-muted-foreground">Next: #{nextBedNumber} — Click to place</span>}
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
          cursor: placementMode ? 'crosshair' : draggingBedId ? 'grabbing' : (isPanning ? 'grabbing' : 'grab'),
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <div
          ref={canvasRef}
          className="absolute bg-background rounded shadow-sm"
          style={{
            width: roomWidth, height: roomHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {layoutImage && (
            <img src={layoutImage} alt="Layout background" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ opacity: layoutImageOpacity / 100, zIndex: 0 }} />
          )}

          {beds.map(bed => {
            const isSelected = selectedBed?.id === bed.id;
            const isBlocked = bed.is_blocked;
            const isOccupied = !bed.is_available && !isBlocked;
            const isDragging = draggingBedId === bed.id;

            const bedStatus = isSelected ? 'selected' : isBlocked ? 'blocked' : isOccupied ? 'occupied' : 'available';
            const bedRotation = bed.rotation || 0;

            return (
              <div key={bed.id} className="group absolute" style={{
                left: bed.position_x - BED_W / 2,
                top: bed.position_y - BED_H / 2,
                zIndex: isDragging ? 30 : isSelected ? 20 : 5,
                cursor: placementMode ? 'crosshair' : 'move',
              }}>
                <div
                  className={`select-none transition-all ${isDragging ? 'shadow-lg scale-110' : ''} ${isSelected ? 'ring-2 ring-primary/50 rounded' : ''}`}
                  style={{ width: BED_W, height: BED_H }}
                  onMouseDown={e => handleBedMouseDown(e, bed)}
                >
                  <BedShapeIcon
                    width={BED_W}
                    height={BED_H}
                    status={bedStatus}
                    bedNumber={bed.bed_number}
                    rotation={bedRotation}
                  />
                </div>
                {/* Rotate button */}
                {onBedRotate && !isDragging && (
                  <button
                    className="absolute -top-2 -left-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border text-foreground shadow-sm"
                    onClick={e => { e.stopPropagation(); onBedRotate(bed.id, ((bed.rotation || 0) + 90) % 360); }}
                    title="Rotate bed"
                  >
                    <RotateCw className="h-3 w-3" />
                  </button>
                )}
                {onDeleteBed && !isDragging && (
                  <button
                    className="absolute -top-2 -right-2 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px]"
                    onClick={e => { e.stopPropagation(); onDeleteBed(bed.id); }}
                    title="Delete bed"
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border border-emerald-400 bg-emerald-50" /><span>Available</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border border-primary bg-primary" /><span>Selected</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border border-blue-400 bg-blue-50" /><span>Occupied</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded border border-destructive/30 bg-destructive/10" /><span>Blocked</span></div>
      </div>

      {/* Placement Dialog */}
      <Dialog open={!!pendingBed} onOpenChange={v => { if (!v) setPendingBed(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Place Bed</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Bed Number</Label>
              <Input type="number" min={1} value={placeBedNumber} onChange={e => setPlaceBedNumber(+e.target.value || 1)} />
            </div>
            <div>
              <Label>Sharing Option</Label>
              <Select value={placeSharingOption} onValueChange={setPlaceSharingOption}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sharing type" /></SelectTrigger>
                <SelectContent>
                  {sharingOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.type} (₹{s.price_monthly}/mo)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category (optional)</Label>
              <Select value={placeCategory} onValueChange={setPlaceCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name} (+₹{cat.price_adjustment})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingBed(null)}>Cancel</Button>
            <Button onClick={handlePlacementConfirm} disabled={!placeSharingOption}>Place Bed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Bed Dialog */}
      <Dialog open={showMultiBedDialog} onOpenChange={setShowMultiBedDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5" /> Add Multiple Beds</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Number of Beds</Label>
              <Input type="number" min={1} max={50} value={multiBedCount} onChange={e => setMultiBedCount(+e.target.value || 1)} />
            </div>
            <div>
              <Label>Sharing Option</Label>
              <Select value={multiBedSharing} onValueChange={setMultiBedSharing}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sharing type" /></SelectTrigger>
                <SelectContent>
                  {sharingOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.type} (₹{s.price_monthly}/mo)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category (optional)</Label>
              <Select value={multiBedCategory} onValueChange={setMultiBedCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name} (+₹{cat.price_adjustment})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p><strong>Preview:</strong> {multiBedCount} beds will be auto-arranged in a grid pattern</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMultiBedDialog(false)}>Cancel</Button>
            <Button onClick={handleMultiBedGenerate} disabled={!multiBedSharing}>Place {multiBedCount} Beds</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
