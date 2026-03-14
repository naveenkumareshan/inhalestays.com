import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Search, Edit, Trash2, CheckCircle, XCircle, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { reviewsService, Review } from '@/api/reviewsService';
import { cabinsService } from '@/api/cabinsService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

const ReviewManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cabins, setCabins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCabin, setSelectedCabin] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editForm, setEditForm] = useState({ title: '', comment: '', rating: 0 });
  const module = searchParams.get('module');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [selectedCabin, statusFilter, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reviewsResponse, cabinsResponse] = await Promise.all([
        reviewsService.getAdminReviews(statusFilter, selectedCabin, currentPage, itemsPerPage),
        cabinsService.getAllCabinsWithOutFilter(),
      ]);

      if (reviewsResponse.success) {
        setReviews(reviewsResponse.data as unknown as Review[]);
        setTotalCount(reviewsResponse.total || 0);
        setTotalPages(reviewsResponse.totalPages || 0);
      }
      if (cabinsResponse.success) {
        setCabins(cabinsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      await reviewsService.updateReviewStatus(reviewId, 'approved');
      toast({ title: "Review approved", description: "The review is now published" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve review", variant: "destructive" });
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      await reviewsService.updateReviewStatus(reviewId, 'rejected');
      toast({ title: "Review rejected", description: "The review has been rejected" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject review", variant: "destructive" });
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewsService.deleteReview(reviewId);
      toast({ title: "Review deleted", description: "The review has been removed" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditForm({ title: review.title || '', comment: review.comment, rating: review.rating });
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    try {
      const { error } = await supabase
        .from('reviews' as any)
        .update({ title: editForm.title, comment: editForm.comment, rating: editForm.rating } as any)
        .eq('id', editingReview.id);
      if (error) throw error;
      toast({ title: "Review updated", description: "The review has been updated successfully" });
      setEditingReview(null);
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update review", variant: "destructive" });
    }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleItemsPerPageChange = (items: string) => {
    setItemsPerPage(parseInt(items));
    setCurrentPage(1);
  };

  const filteredReviews = reviews.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.profiles?.name || '').toLowerCase().includes(term) ||
      r.comment.toLowerCase().includes(term) ||
      (r.title || '').toLowerCase().includes(term)
    );
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reading Room Reviews</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Moderate and manage customer reviews</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search Reviews</label>
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reading Room</label>
              <Select value={selectedCabin} onValueChange={(v) => { setSelectedCabin(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reading Rooms</SelectItem>
                  {cabins.map((cabin: any) => (
                    <SelectItem key={cabin.id} value={cabin.id}>
                      {cabin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Star className="h-8 w-8 opacity-20" />
              <p className="text-sm font-medium">No reviews found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Pagination */}
          <AdminTablePagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={itemsPerPage}
            onPageChange={handlePageChange}
            onPageSizeChange={(s) => handleItemsPerPageChange(s.toString())}
          />

          {filteredReviews.map((review, idx) => (
            <Card key={review.id} className={`border-border/60 shadow-sm ${review.status === 'pending' ? "border-l-2 border-l-amber-400" : review.status === 'rejected' ? "border-l-2 border-l-red-400" : ""}`}>
              <CardHeader className="py-2 px-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground min-w-[24px]">#{getSerialNumber(idx, currentPage, itemsPerPage)}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.profiles?.profile_picture || undefined} alt={review.profiles?.name || ''} />
                      <AvatarFallback className="text-xs">
                        {(review.profiles?.name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{review.profiles?.name || 'Anonymous'}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border capitalize ${getStatusStyle(review.status)}`}>
                      {review.status === 'approved' ? <Eye className="h-3 w-3" /> : review.status === 'rejected' ? <XCircle className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {review.status}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-3 pt-0">
                {review.cabins && (
                  <p className="text-xs font-medium text-muted-foreground mb-1">{review.cabins.name}</p>
                )}
                {review.title && (
                  <p className="text-sm font-medium mb-1">{review.title}</p>
                )}
                <p className="text-xs text-muted-foreground mb-3">{review.comment}</p>

                <div className="flex gap-1.5">
                  {user?.role === 'admin' && review.status !== 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(review.id)}
                      className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  )}
                  {user?.role === 'admin' && review.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(review.id)}
                      className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(review)}
                      className="h-7 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(review.id)}
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

        </div>
      )}

      {/* Edit Dialog */}
      {editingReview && (
        <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rating</Label>
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setEditForm(prev => ({ ...prev, rating: star }))} className="focus:outline-none">
                      <Star className={`h-6 w-6 ${star <= editForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Review title" />
              </div>
              <div>
                <Label htmlFor="edit-comment">Comment</Label>
                <Textarea id="edit-comment" value={editForm.comment} onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))} placeholder="Review comment" rows={4} />
              </div>
              <Button onClick={handleUpdateReview} className="w-full">Update Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReviewManagement;
