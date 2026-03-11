import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';

interface DocRef {
  name: string;
  path: string;
  uploaded_at: string;
}

interface CheckInUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  module: 'reading_room' | 'hostel';
  onUploaded: () => void;
}

const CheckInUploadDialog = ({ open, onOpenChange, booking, module, onUploaded }: CheckInUploadDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const existingDocs: DocRef[] = Array.isArray(booking?.check_in_documents) ? booking.check_in_documents : [];
  const table = module === 'reading_room' ? 'bookings' : 'hostel_bookings';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newDocs: DocRef[] = [...existingDocs];

      for (const file of Array.from(files)) {
        const filePath = `${booking.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('checkin-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        newDocs.push({
          name: file.name,
          path: filePath,
          uploaded_at: new Date().toISOString(),
        });
      }

      const { error: updateError } = await supabase
        .from(table)
        .update({ check_in_documents: newDocs } as any)
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast({ title: 'Documents uploaded successfully' });
      onUploaded();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async (doc: DocRef) => {
    const { data, error } = await supabase.storage
      .from('checkin-documents')
      .createSignedUrl(doc.path, 300);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (doc: DocRef) => {
    setDeleting(doc.path);
    try {
      await supabase.storage.from('checkin-documents').remove([doc.path]);
      const updatedDocs = existingDocs.filter((d) => d.path !== doc.path);
      const { error } = await supabase
        .from(table)
        .update({ check_in_documents: updatedDocs } as any)
        .eq('id', booking.id);
      if (error) throw error;
      toast({ title: 'Document deleted' });
      onUploaded();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Upload Documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Student: </span>
            <span className="font-medium">{booking?.profiles?.name || 'N/A'}</span>
          </div>

          {/* Existing docs */}
          {existingDocs.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Uploaded Documents</label>
              {existingDocs.map((doc) => (
                <div key={doc.path} className="flex items-center justify-between gap-2 p-2 border rounded text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDownload(doc)}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.path}
                    >
                      {deleting === doc.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Add Files (Aadhar, forms, etc.)</label>
            <div className="mt-1 flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" /> Gallery
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                <Camera className="h-3 w-3" /> Capture
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInUploadDialog;
