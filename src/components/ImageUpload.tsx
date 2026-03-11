
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadService } from '@/api/uploadService';
import { getImageUrl } from '@/lib/utils';

export interface ImageUploadProps {
  onUpload: (url: string) => void;
  onRemove?: (url: string) => void;
  existingImages?: string[];
  className?: string;
  maxSize?: number; // in MB
  maxCount?: number; // undefined = unlimited
  allowedTypes?: string[];
  cabinId?: string; // Optional cabinId for cabin-specific uploads
}
export function ImageUpload({ 
  onUpload, 
  onRemove,
  existingImages = [],
  className = '',
  maxSize = 5, // 5MB default
  maxCount,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  cabinId
}: ImageUploadProps) {
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  
  // Use both existing and locally uploaded images (filter out falsy values)
  const allImages = [...existingImages.filter(Boolean), ...uploadedImages.filter(img => img && !existingImages.includes(img))];
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: `Please upload one of these formats: ${allowedTypes.join(', ')}`,
      });
      return;
    }
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) { // Convert MB to bytes
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB`,
      });
      return;
    }
    
    // Validate max count
    if (maxCount !== undefined && allImages.length >= maxCount) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: `Maximum of ${maxCount} images allowed`,
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      let uploadResponse;
      
      // Use cabin-specific upload if cabinId is provided
      if (cabinId) {
        uploadResponse = await uploadService.uploadCabinImage(cabinId, file);
      } else {
        uploadResponse = await uploadService.uploadImage(file);
      }
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || 'Upload failed');
      }
      
      const url = uploadResponse.data.url;
      
      setUploadedImages(prev => [...prev, url]);
      onUpload(url);
      
      toast({
        title: "Image uploaded",
        description: "The image has been successfully uploaded",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemove = async (url: string) => {
    if (!url || !onRemove) return;
    
    try {
      // If it's a URL from backend, delete it there too
      if (!url.startsWith('blob:')) {
        // await uploadService.deleteImage(url);
      }
      
      setUploadedImages(prev => prev.filter(img => img !== url));
      onRemove(url);
      
      toast({
        title: "Image removed",
        description: "The image has been removed"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to remove image",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="relative overflow-hidden"
          size="sm"
          disabled={isUploading || (maxCount !== undefined && allImages.length >= maxCount)}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isUploading ? "Uploading..." : "Upload Image"}
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={isUploading || (maxCount !== undefined && allImages.length >= maxCount)}
            accept={allowedTypes.join(',')}
          />
        </Button>
        <span className="text-xs text-muted-foreground">
          {maxCount !== undefined ? `${allImages.length} / ${maxCount} images` : `${allImages.length} images uploaded`}
        </span>
      </div>
      
      {allImages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {allImages.map((img, index) => (
            <div key={index} className="relative border rounded-md overflow-hidden group">
              <img 
                src={getImageUrl(img)} 
                alt={`Uploaded image ${index + 1}`} 
                className="w-full h-24 object-cover"
                loading="lazy"
              />
              {onRemove && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(img)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] p-1 text-center">
                {index === 0 ? "Main Image" : `Image ${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
