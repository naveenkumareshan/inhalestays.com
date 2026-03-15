import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MapPin, Plus, Search, Map, Building2, Navigation, Pencil, EyeOff, Eye, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { locationsService, State, City, Area } from '@/api/locationsService';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { EmptyState } from '@/components/ui/empty-state';

const LocationManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('states');
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterStateId, setFilterStateId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', code: '', stateId: '', cityId: '', pincode: '', latitude: '', longitude: ''
  });

  // Stats
  const [statCounts, setStatCounts] = useState({ states: 0, cities: 0, areas: 0, inactiveStates: 0, inactiveCities: 0, inactiveAreas: 0 });

  const loadStats = useCallback(async () => {
    const [sRes, cRes, aRes, siRes, ciRes, aiRes] = await Promise.all([
      locationsService.getAllStates(),
      locationsService.getCities({}),
      locationsService.getAreas({}),
      locationsService.getStates({ search: '' }), // active only
      locationsService.getCities({}),
      locationsService.getAreas({}),
    ]);
    const totalStates = sRes.success ? sRes.data.length : 0;
    const activeStates = siRes.success ? siRes.data.length : 0;
    const totalCities = cRes.success ? (cRes.data as any[]).length : 0;
    const totalAreas = aRes.success ? (aRes.data as any[]).length : 0;
    setStatCounts({
      states: activeStates,
      cities: totalCities,
      areas: totalAreas,
      inactiveStates: totalStates - activeStates,
      inactiveCities: 0,
      inactiveAreas: 0
    });
    if (sRes.success) setAllStates(sRes.data);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'states': {
          const response = showInactive
            ? await locationsService.getAllStates()
            : await locationsService.getStates({ search: searchTerm || undefined, limit: 500 });
          if (response.success) {
            let filtered = response.data;
            if (showInactive && searchTerm) {
              filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            if (!showInactive && response.data) {
              filtered = filtered.filter(s => s.is_active);
            }
            setStates(filtered);
          }
          break;
        }
        case 'cities': {
          const response = await locationsService.getCities({
            search: searchTerm || undefined,
            stateId: filterStateId || undefined,
            limit: 500
          });
          if (response.success) setCities(response.data as any);
          break;
        }
        case 'areas': {
          const response = await locationsService.getAreas({
            search: searchTerm || undefined,
            cityId: filterCityId || undefined,
            limit: 500
          });
          if (response.success) setAreas(response.data as any);
          break;
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast({ title: "Error", description: "Failed to load location data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, showInactive, filterStateId, filterCityId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, showInactive, filterStateId, filterCityId]);

  // Load cities for filter when state filter changes
  const [filterCities, setFilterCities] = useState<City[]>([]);
  useEffect(() => {
    if (filterStateId) {
      locationsService.getCities({ stateId: filterStateId, limit: 500 }).then(r => {
        if (r.success) setFilterCities(r.data as any);
      });
    } else {
      setFilterCities([]);
      setFilterCityId('');
    }
  }, [filterStateId]);

  // Load cities for form when stateId changes
  useEffect(() => {
    if (formData.stateId) {
      locationsService.getCities({ stateId: formData.stateId, limit: 500 }).then(r => {
        if (r.success) setAllCities(r.data as any);
      });
    } else {
      setAllCities([]);
    }
  }, [formData.stateId]);

  const resetForm = () => {
    setFormData({ name: '', code: '', stateId: '', cityId: '', pincode: '', latitude: '', longitude: '' });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      stateId: item.state_id || item.state?.id || '',
      cityId: item.city_id || item.city?.id || '',
      pincode: item.pincode || '',
      latitude: item.latitude?.toString() || '',
      longitude: item.longitude?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" });
      return;
    }

    try {
      let response: any;

      if (editingItem) {
        // Update
        switch (activeTab) {
          case 'states':
            response = await locationsService.updateState(editingItem.id, { name: formData.name, code: formData.code });
            break;
          case 'cities':
            response = await locationsService.updateCity(editingItem.id, {
              name: formData.name,
              state_id: formData.stateId,
              latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
              longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
            } as any);
            break;
          case 'areas':
            response = await locationsService.updateArea(editingItem.id, {
              name: formData.name,
              city_id: formData.cityId,
              pincode: formData.pincode,
              latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
              longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
            } as any);
            break;
        }
      } else {
        // Create
        switch (activeTab) {
          case 'states':
            if (!formData.code.trim()) {
              toast({ title: "Validation", description: "State code is required", variant: "destructive" });
              return;
            }
            response = await locationsService.createState({ name: formData.name, code: formData.code });
            break;
          case 'cities':
            if (!formData.stateId) {
              toast({ title: "Validation", description: "State is required", variant: "destructive" });
              return;
            }
            response = await locationsService.createCity({
              name: formData.name,
              state_id: formData.stateId,
              latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
              longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
            });
            break;
          case 'areas':
            if (!formData.cityId) {
              toast({ title: "Validation", description: "City is required", variant: "destructive" });
              return;
            }
            response = await locationsService.createArea({
              name: formData.name,
              city_id: formData.cityId,
              pincode: formData.pincode,
              latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
              longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
            });
            break;
        }
      }

      if (response?.success) {
        toast({ title: "Success", description: `${activeTab.slice(0, -1)} ${editingItem ? 'updated' : 'created'} successfully` });
        setIsDialogOpen(false);
        resetForm();
        loadData();
        loadStats();
      } else {
        throw new Error(response?.error || 'Operation failed');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Operation failed', variant: "destructive" });
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm(`Are you sure you want to deactivate this ${activeTab.slice(0, -1)}?`)) return;
    try {
      let response: any;
      switch (activeTab) {
        case 'states': response = await locationsService.deactivateState(id); break;
        case 'cities': response = await locationsService.deactivateCity(id); break;
        case 'areas': response = await locationsService.deactivateArea(id); break;
      }
      if (response?.success) {
        toast({ title: "Success", description: `Deactivated successfully` });
        loadData();
        loadStats();
      } else throw new Error(response?.error);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Failed to deactivate', variant: "destructive" });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      let response: any;
      switch (activeTab) {
        case 'states': response = await locationsService.updateState(id, { is_active: true }); break;
        case 'cities': response = await locationsService.updateCity(id, { is_active: true } as any); break;
        case 'areas': response = await locationsService.updateArea(id, { is_active: true } as any); break;
      }
      if (response?.success) {
        toast({ title: "Success", description: `Reactivated successfully` });
        loadData();
        loadStats();
      } else throw new Error(response?.error);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Failed to reactivate', variant: "destructive" });
    }
  };

  // Current tab data for pagination
  const currentData = activeTab === 'states' ? states : activeTab === 'cities' ? cities : areas;
  const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statCards = [
    { label: 'States', value: statCounts.states, icon: Map, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Cities', value: statCounts.cities, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Areas', value: statCounts.areas, icon: Navigation, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Location Management</h1>
            <p className="text-xs text-muted-foreground">Manage states, cities and areas</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Add {activeTab === 'states' ? 'State' : activeTab === 'cities' ? 'City' : 'Area'}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchTerm(''); setFilterStateId(''); setFilterCityId(''); }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="states" className="text-xs">
                  States <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{statCounts.states}</Badge>
                </TabsTrigger>
                <TabsTrigger value="cities" className="text-xs">
                  Cities <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{statCounts.cities}</Badge>
                </TabsTrigger>
                <TabsTrigger value="areas" className="text-xs">
                  Areas <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{statCounts.areas}</Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
                  <Label htmlFor="show-inactive" className="text-xs text-muted-foreground cursor-pointer">Show Inactive</Label>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <Input placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9 text-xs" />
              </div>
              {(activeTab === 'cities' || activeTab === 'areas') && (
                <Select value={filterStateId} onValueChange={(v) => { setFilterStateId(v === 'all' ? '' : v); setFilterCityId(''); }}>
                  <SelectTrigger className="w-48 h-9 text-xs">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {allStates.filter(s => s.is_active).map((state) => (
                      <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeTab === 'areas' && filterStateId && (
                <Select value={filterCityId} onValueChange={(v) => setFilterCityId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48 h-9 text-xs">
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {filterCities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            ) : paginatedData.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title={`No ${activeTab} found`}
                description={activeTab === 'areas' ? 'Add your first area to enable area selection across the platform' : `No ${activeTab} match your filters`}
                onRetry={openCreateDialog}
                retryLabel={`Add ${activeTab === 'states' ? 'State' : activeTab === 'cities' ? 'City' : 'Area'}`}
              />
            ) : (
              <>
                <TabsContent value="states" className="mt-0">
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[11px]">
                          <TableHead className="w-12 py-2">S.No.</TableHead>
                          <TableHead className="py-2">Name</TableHead>
                          <TableHead className="py-2">Code</TableHead>
                          <TableHead className="py-2">Status</TableHead>
                          <TableHead className="py-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paginatedData as State[]).map((item, idx) => (
                          <TableRow key={item.id} className="text-[11px]">
                            <TableCell className="py-1.5 text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                            <TableCell className="py-1.5 font-medium">{item.name}</TableCell>
                            <TableCell className="py-1.5 font-mono">{item.code}</TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant={item.is_active ? 'default' : 'secondary'} className={`text-[10px] ${item.is_active ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-muted text-muted-foreground'}`}>
                                {item.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {item.is_active ? (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeactivate(item.id)}>
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-teal-600" onClick={() => handleReactivate(item.id)}>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="cities" className="mt-0">
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[11px]">
                          <TableHead className="w-12 py-2">S.No.</TableHead>
                          <TableHead className="py-2">Name</TableHead>
                          <TableHead className="py-2">State</TableHead>
                          <TableHead className="py-2">Coordinates</TableHead>
                          <TableHead className="py-2">Status</TableHead>
                          <TableHead className="py-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paginatedData as any[]).map((item, idx) => (
                          <TableRow key={item.id} className="text-[11px]">
                            <TableCell className="py-1.5 text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                            <TableCell className="py-1.5 font-medium">{item.name}</TableCell>
                            <TableCell className="py-1.5">{item.state?.name || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 text-muted-foreground font-mono text-[10px]">
                              {item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : '—'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant="default" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">Active</Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeactivate(item.id)}>
                                  <EyeOff className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="areas" className="mt-0">
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[11px]">
                          <TableHead className="w-12 py-2">S.No.</TableHead>
                          <TableHead className="py-2">Name</TableHead>
                          <TableHead className="py-2">City</TableHead>
                          <TableHead className="py-2">Pincode</TableHead>
                          <TableHead className="py-2">Coordinates</TableHead>
                          <TableHead className="py-2">Status</TableHead>
                          <TableHead className="py-2 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paginatedData as any[]).map((item, idx) => (
                          <TableRow key={item.id} className="text-[11px]">
                            <TableCell className="py-1.5 text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                            <TableCell className="py-1.5 font-medium">{item.name}</TableCell>
                            <TableCell className="py-1.5">{item.city?.name || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 font-mono">{item.pincode || '—'}</TableCell>
                            <TableCell className="py-1.5 text-muted-foreground font-mono text-[10px]">
                              {item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : '—'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant="default" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">Active</Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeactivate(item.id)}>
                                  <EyeOff className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </>
            )}

            {/* Pagination */}
            {currentData.length > 0 && (
              <AdminTablePagination
                currentPage={currentPage}
                totalItems={currentData.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              />
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingItem ? 'Edit' : 'Add'} {activeTab === 'states' ? 'State' : activeTab === 'cities' ? 'City' : 'Area'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter name" className="h-9 text-sm" />
            </div>

            {activeTab === 'states' && (
              <div>
                <Label htmlFor="code" className="text-xs">Code *</Label>
                <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., KA" maxLength={3} className="h-9 text-sm" />
              </div>
            )}

            {activeTab === 'cities' && (
              <div>
                <Label className="text-xs">State *</Label>
                <Select value={formData.stateId} onValueChange={(value) => setFormData({ ...formData, stateId: value })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {allStates.filter(s => s.is_active).map((state) => (
                      <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === 'areas' && (
              <>
                <div>
                  <Label className="text-xs">State *</Label>
                  <Select value={formData.stateId} onValueChange={(value) => setFormData({ ...formData, stateId: value, cityId: '' })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {allStates.filter(s => s.is_active).map((state) => (
                        <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">City *</Label>
                  <Select value={formData.cityId} onValueChange={(value) => setFormData({ ...formData, cityId: value })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {allCities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pincode" className="text-xs">Pincode</Label>
                  <Input id="pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="Enter pincode" className="h-9 text-sm" />
                </div>
              </>
            )}

            {(activeTab === 'cities' || activeTab === 'areas') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input id="latitude" type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} placeholder="Lat" className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input id="longitude" type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} placeholder="Lng" className="h-9 text-sm" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationManagement;
