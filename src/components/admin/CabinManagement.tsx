import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '../ImageUpload';
import { Edit, Trash2, Building, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SeatManagementLink } from './SeatManagementLink';
import ErrorBoundary from '../ErrorBoundary';

export interface CabinData {
  id: string | number;
  _id: string;
  name: string;
  description: string;
  price: number;
  capacity?: number;
  amenities?: string[];
  imageUrl: string;
  category: 'standard' | 'premium' | 'luxury';
  isActive?: boolean;
  serialNumber?: string;
  totalSeats?: number;
  occupied?: number;
  available?: number;
}

interface CabinManagementProps {
  cabins: CabinData[];
  onImageUpload?: (cabinId: number, url: string) => void;
  onEditCabin?: (index: number) => void;
  onToggleActive?: (cabinId: string, isActive: boolean) => void;
  onExportData?: (cabinId: number) => void;
  onViewSeatDetails?: (cabin: CabinData) => void;
  isAdmin?: boolean;
}

export function CabinManagement({ 
  cabins, 
  onImageUpload, 
  onEditCabin, 
  onToggleActive, 
  onExportData,
  onViewSeatDetails,
  isAdmin = false
}: CabinManagementProps) {
  const [selectedCabin, setSelectedCabin] = useState<number | null>(null);
  const navigate = useNavigate();

  // Ensure cabins is always an array
  const cabinsList = Array.isArray(cabins) ? cabins : [];

  const handleImageUpload = (cabinId: number, url: string) => {
    if (onImageUpload) {
      onImageUpload(cabinId, url);
    }
  };

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cabinsList.map((cabin, index) => (
          <Card key={cabin.id} className={`overflow-hidden hover:shadow-md transition-shadow ${!cabin.isActive ? 'opacity-70' : ''}`}>
            <div className="relative h-48 overflow-hidden">
              {cabin.imageUrl ? (
                <img 
                  src={cabin.imageUrl} 
                  alt={cabin.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Building className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              <div className="absolute top-0 left-0 p-2">
                <Badge className={cabin.category === 'standard' ? 'bg-blue-500' : (cabin.category === 'premium' ? 'bg-purple-500' : 'bg-amber-500')}>
                  {cabin.category.charAt(0).toUpperCase() + cabin.category.slice(1)}
                </Badge>
              </div>
              
              {cabin.serialNumber && (
                <div className="absolute top-0 right-0 p-2">
                  <Badge variant="outline" className="bg-white/80 border-none">
                    #{cabin.serialNumber}
                  </Badge>
                </div>
              )}
              
              {!cabin.isActive && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Badge className="bg-red-500 text-white py-1 px-2">
                    Inactive
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-medium text-lg mb-1">{cabin.name}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                {cabin.description}
              </p>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                <span>₹{cabin.price}/month</span>
                <span>Capacity: {cabin.capacity || 1}</span>
              </div>
              
              {(cabin.totalSeats !== undefined && cabin.occupied !== undefined && cabin.available !== undefined) && (
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-3 bg-accent/30 p-2 rounded">
                  <span>Total: {cabin.totalSeats} seats</span>
                  <span>Occupied: {cabin.occupied}</span>
                  <span>Available: {cabin.available}</span>
                </div>
              )}
              
              <div className="mt-4 flex flex-wrap gap-2">
                <SeatManagementLink 
                  cabinId={cabin.id}
                  serialNumber={cabin.serialNumber}
                  isAdmin={isAdmin}
                />
                
                {onEditCabin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEditCabin(index)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {onToggleActive && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const cabinId = cabin._id;
                      onToggleActive(cabinId, !cabin.isActive);
                    }}
                    className={`flex items-center gap-1 ${!cabin.isActive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {!cabin.isActive ? 'Activate' : 'Deactivate'}
                  </Button>
                )}
                
                {onExportData && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const cabinId = typeof cabin.id === 'string' ? parseInt(cabin.id) : cabin.id;
                      onExportData(cabinId);
                    }}
                  >
                    Export
                  </Button>
                )}
                
                {onViewSeatDetails && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onViewSeatDetails(cabin)}
                  >
                    View Details
                  </Button>
                )}
              </div>
              
              {onImageUpload && selectedCabin === index && (
                <div className="mt-4">
                  <ImageUpload 
                    onUpload={(url) => {
                      const cabinId = typeof cabin.id === 'string' ? parseInt(cabin.id) : cabin.id;
                      handleImageUpload(cabinId, url);
                    }} 
                    onRemove={() => setSelectedCabin(null)}
                    existingImages={cabin.imageUrl ? [cabin.imageUrl] : []}
                  />
                </div>
              )}
              
              {onImageUpload && selectedCabin !== index && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCabin(index)}
                  className="w-full mt-2 text-xs"
                >
                  Change Image
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ErrorBoundary>
  );
}
