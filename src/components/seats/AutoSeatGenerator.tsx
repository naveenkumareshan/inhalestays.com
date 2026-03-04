import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Grid3X3 } from 'lucide-react';

export interface GeneratedSeat {
  number: number;
  row: number;
  col: number;
  position: { x: number; y: number };
  price: number;
}

interface AutoSeatGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (seats: GeneratedSeat[]) => void;
  roomWidth: number;
  roomHeight: number;
  gridSize: number;
  existingSeatCount: number;
}

export const AutoSeatGenerator: React.FC<AutoSeatGeneratorProps> = ({
  open,
  onOpenChange,
  onGenerate,
  roomWidth,
  roomHeight,
  gridSize,
  existingSeatCount,
}) => {
  const [rows, setRows] = useState(5);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [aisleAfter, setAisleAfter] = useState(4);
  const [spacing, setSpacing] = useState(50);
  const [price, setPrice] = useState(2000);

  const snap = (val: number) => Math.round(val / gridSize) * gridSize;

  const handleGenerate = () => {
    const seats: GeneratedSeat[] = [];
    let seatNumber = existingSeatCount + 1;

    const aisleWidth = spacing;
    const startX = snap(Math.max(gridSize * 3, 60));
    const startY = snap(Math.max(gridSize * 5, 100));

    for (let r = 0; r < rows; r++) {
      let colOffset = 0;
      for (let c = 0; c < seatsPerRow; c++) {
        // Add aisle gap
        if (aisleAfter > 0 && c > 0 && c % aisleAfter === 0) {
          colOffset += aisleWidth;
        }

        const x = snap(startX + c * spacing + colOffset);
        const y = snap(startY + r * spacing);

        seats.push({
          number: seatNumber++,
          row: r,
          col: c,
          position: { x, y },
          price,
        });
      }
    }

    onGenerate(seats);
    onOpenChange(false);
  };

  // Preview calculation
  const totalSeats = rows * seatsPerRow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Auto Generate Seats
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Number of Rows</Label>
              <Input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(+e.target.value || 1)} />
            </div>
            <div>
              <Label>Seats per Row</Label>
              <Input type="number" min={1} max={30} value={seatsPerRow} onChange={(e) => setSeatsPerRow(+e.target.value || 1)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Aisle after X Seats</Label>
              <Input type="number" min={0} max={seatsPerRow} value={aisleAfter} onChange={(e) => setAisleAfter(+e.target.value || 0)} />
            </div>
            <div>
              <Label>Seat Spacing (px)</Label>
              <Input type="number" min={30} max={100} value={spacing} onChange={(e) => setSpacing(+e.target.value || 50)} />
            </div>
          </div>
          <div>
            <Label>Price per Seat (₹/month)</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value || 0)} />
          </div>

          <div className="bg-muted rounded-lg p-3 text-sm">
            <p><strong>Preview:</strong> {totalSeats} seats in {rows} rows × {seatsPerRow} columns</p>
            {aisleAfter > 0 && <p className="text-muted-foreground">Aisle gap after every {aisleAfter} seats</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate}>Generate {totalSeats} Seats</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
