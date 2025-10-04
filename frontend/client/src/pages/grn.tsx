import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";
import { masterDataApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, Search, Filter, Edit, Trash2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import GRNModal from "@/components/modals/grn-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function GRN() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/grns"] });
      toast({
        title: "Refreshed",
        description: "GRN data has been updated",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const grnsQuery = useRetryableQuery({
    queryKey: ["/api/grns"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const suppliersQuery = useRetryableQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 60 * 1000, // 1 minute
  });

  const locationsQuery = useRetryableQuery({
    queryKey: ["/api/locations"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const categoriesQuery = useRetryableQuery({
    queryKey: ["/api/categories"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const productsQuery = useRetryableQuery({
    queryKey: ["/api/products"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract data with fallbacks from response objects
  const grns = grnsQuery.data?.grns || [];
  const suppliers = suppliersQuery.data?.suppliers || [];
  const locations = locationsQuery.data?.locations || [];
  const categories = categoriesQuery.data?.categories || [];
  const products = productsQuery.data?.products || [];
  const isLoading = grnsQuery.isLoading;

  const createGrnMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/grns', data);
    },
    onSuccess: () => {
      toast({
        title: "GRN created successfully",
        description: "Goods receipt has been recorded and inventory updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create GRN",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteGrnMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/grns/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "GRN deleted successfully",
        description: "The goods receipt note has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grns"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete GRN",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers?.find((s: any) => s.id === supplierId);
    return supplier ? supplier.name : "Unknown Supplier";
  };

  const getLocationName = (locationId: number) => {
    const location = locations?.find((l: any) => l.id === locationId);
    return location ? location.name : "Unknown Location";
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.product_name : "Unknown Product";
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredGrns = grns?.filter((grn: any) => {
    const matchesSearch = grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getSupplierName(grn.supplierId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getLocationName(grn.locationId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = selectedSupplier === "all" || grn.supplierId.toString() === selectedSupplier;
    const matchesLocation = selectedLocation === "all" || grn.locationId.toString() === selectedLocation;
    
    let matchesDate = true;
    if (selectedDateRange !== "all") {
      const grnDate = new Date(grn.receiptDate);
      const today = new Date();
      switch (selectedDateRange) {
        case "today":
          matchesDate = grnDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = grnDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = grnDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesSupplier && matchesLocation && matchesDate;
  });

  const paginatedGrns = filteredGrns?.slice(0, rowsPerPage);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Goods Receipt Notes (GRN)</h1>
            <p className="text-muted-foreground">Manage incoming inventory receipts</p>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            New GRN
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-24 h-6 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Goods Receipt Notes (GRN)</h1>
            <p className="text-muted-foreground">Manage incoming inventory receipts</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New GRN
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search GRNs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map((location: any) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGrns?.length > 0 ? (
                paginatedGrns.map((grn: any) => (
                  <>
                    <TableRow 
                      key={grn.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpansion(grn.id)}
                    >
                      <TableCell className="font-mono">{grn.grnNumber}</TableCell>
                      <TableCell>
                        {grn.receiptDate 
                          ? format(new Date(grn.receiptDate.replace('+00:00Z', '').replace('T', ' ')), "MMM dd, yyyy")
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>{getSupplierName(grn.supplierId)}</TableCell>
                      <TableCell>{getLocationName(grn.locationId)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit functionality would go here
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this GRN?')) {
                                deleteGrnMutation.mutate(grn.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedRows.has(grn.id) ? (
                            <ChevronUp className="w-4 h-4 ml-2" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-2" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(grn.id) && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold">GRN Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>GRN Number:</strong> {grn.grnNumber}
                              </div>
                              <div>
                                <strong>Receipt Date:</strong> {grn.receiptDate ? format(new Date(grn.receiptDate.replace('+00:00Z', '').replace('T', ' ')), "MMM dd, yyyy") : "N/A"}
                              </div>
                              <div>
                                <strong>Supplier:</strong> {getSupplierName(grn.supplierId)}
                              </div>
                              <div>
                                <strong>Location:</strong> {getLocationName(grn.locationId)}
                              </div>
                              <div>
                                <strong>Created:</strong> {grn.createdAt ? format(new Date(grn.createdAt.replace('+00:00Z', '').replace('T', ' ')), "MMM dd, yyyy HH:mm") : "N/A"}
                              </div>
                              <div>
                                <strong>Created By:</strong> User {grn.createdBy}
                              </div>
                            </div>
                            <div>
                              <h5 className="font-semibold mb-2">Items</h5>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Quantity (Bags)</TableHead>
                                    <TableHead>Weight (KG)</TableHead>
                                    <TableHead>Remarks</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {grn.items?.map((item: any, index: number) => (
                                    <TableRow key={`${grn.id}-item-${index}`}>
                                      <TableCell>{getCategoryName(item.categoryId)}</TableCell>
                                      <TableCell>{getProductName(item.productId)}</TableCell>
                                      <TableCell>{item.quantityBags}</TableCell>
                                      <TableCell>{item.weightKg}</TableCell>
                                      <TableCell>{item.remarks || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No GRNs found. Create your first goods receipt note.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedGrns?.length || 0} of {filteredGrns?.length || 0} GRNs
        </div>
        <Select value={rowsPerPage.toString()} onValueChange={(value) => setRowsPerPage(Number(value))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <GRNModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onSubmit={(data) => createGrnMutation.mutate(data)}
        isLoading={createGrnMutation.isPending}
      />
    </div>
  );
}
