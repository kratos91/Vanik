import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ChevronDown, ChevronUp, Package, BarChart3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  productId: number;
  productName: string;
  availableQuantity: number;
  committedQuantity: number;
  totalQuantity: number;
  lotCount: number;
}

interface Lot {
  id: number;
  lotNumber: string;
  availableQuantity: number;
  committedQuantity: number;
  totalQuantity: number;
  expiryDate?: string;
  supplierName?: string;
  createdAt?: string;
}

interface ProductWithLots extends Product {
  lots?: Lot[];
}

interface CategoryStock {
  categoryId: number;
  categoryName: string;
  totalAvailable: number;
  totalCommitted: number;
  totalQuantity: number;
  productCount: number;
  products: Product[];
}

interface Location {
  id: number;
  name: string;
  isActive: boolean;
}

export default function StockLevels() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [productLots, setProductLots] = useState<Record<number, Lot[]>>({});
  const [loadingLots, setLoadingLots] = useState<Set<number>>(new Set());
  
  const queryClient = useQueryClient();

  // Fetch locations for filtering
  const { data: locationsData } = useQuery({
    queryKey: ['/api/locations'],
  });

  // Fetch stock levels by category
  const { 
    data: stockData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/inventory/stock-levels-by-category', selectedLocation],
    queryFn: async () => {
      const url = selectedLocation && selectedLocation !== "all"
        ? `/api/inventory/stock-levels-by-category?location_id=${selectedLocation}`
        : '/api/inventory/stock-levels-by-category';
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
  });

  const toggleRowExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedRows(newExpanded);
  };

  const toggleProductExpansion = async (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
      
      // Load lot details if not already loaded
      if (!productLots[productId]) {
        // Set loading state
        setLoadingLots(prev => new Set(prev).add(productId));
        
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(`/api/inventory/stock-levels?product_id=${productId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const lotData = await response.json();
            // Backend returns data in 'stockLevels' array
            const lots = lotData.stockLevels || [];
            // Calculate total quantity for each lot
            const processedLots = lots.map((lot: any) => ({
              ...lot,
              totalQuantity: lot.availableQuantity + lot.committedQuantity
            }));
            setProductLots(prev => ({
              ...prev,
              [productId]: processedLots
            }));
          }
        } catch (error) {
          console.error('Error loading lot details:', error);
        } finally {
          // Clear loading state
          setLoadingLots(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
        }
      }
    }
    
    setExpandedProducts(newExpanded);
  };

  const categories: CategoryStock[] = stockData?.categories || [];
  const locations: Location[] = (locationsData as { locations?: Location[] })?.locations || [];

  // Calculate totals
  const totals = categories.reduce(
    (acc, category) => ({
      totalAvailable: acc.totalAvailable + category.totalAvailable,
      totalCommitted: acc.totalCommitted + category.totalCommitted,
      totalQuantity: acc.totalQuantity + category.totalQuantity,
      categoryCount: acc.categoryCount + 1,
    }),
    { totalAvailable: 0, totalCommitted: 0, totalQuantity: 0, categoryCount: 0 }
  );

  const formatWeight = (weight: number) => {
    return weight.toFixed(2);
  };

  const getStockStatus = (available: number, committed: number) => {
    const total = available + committed;
    if (total === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (available === 0) return { label: 'Fully Reserved', variant: 'outline' as const };
    if (committed > available) return { label: 'High Demand', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const handleRefresh = async () => {
    // Clear all cached lot data
    setProductLots({});
    setExpandedProducts(new Set());
    
    // Invalidate all related queries to force fresh data
    await queryClient.invalidateQueries({ queryKey: ['/api/inventory/stock-levels-by-category'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/inventory/stock-levels'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
    
    // Also trigger refetch to ensure immediate update
    refetch();
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              Error loading stock levels. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Levels</h1>
          <p className="text-muted-foreground">
            Monitor inventory levels by category and product
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Available</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWeight(totals.totalAvailable)} kg</div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Committed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWeight(totals.totalCommitted)} kg</div>
            <p className="text-xs text-muted-foreground">Reserved for orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWeight(totals.totalQuantity)} kg</div>
            <p className="text-xs text-muted-foreground">All inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.categoryCount}</div>
            <p className="text-xs text-muted-foreground">With stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels by Category</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on any category row to view product details
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock found. Try adjusting your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Available (kg)</TableHead>
                  <TableHead className="text-right">Committed (kg)</TableHead>
                  <TableHead className="text-right">Total (kg)</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <React.Fragment key={`category-${category.categoryId}`}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpansion(category.categoryId)}
                    >
                      <TableCell className="font-medium">
                        {category.categoryName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatWeight(category.totalAvailable)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatWeight(category.totalCommitted)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatWeight(category.totalQuantity)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{category.productCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getStockStatus(category.totalAvailable, category.totalCommitted).variant}
                        >
                          {getStockStatus(category.totalAvailable, category.totalCommitted).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {expandedRows.has(category.categoryId) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(category.categoryId) && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold">Products in {category.categoryName}</h4>
                            {category.products.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                No products found in this category
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead className="text-right">Available (kg)</TableHead>
                                    <TableHead className="text-right">Committed (kg)</TableHead>
                                    <TableHead className="text-right">Total (kg)</TableHead>
                                    <TableHead className="text-center">Lots</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {category.products.map((product) => (
                                    <React.Fragment key={`product-${product.productId}`}>
                                      <TableRow 
                                        className="cursor-pointer hover:bg-muted/30"
                                        onClick={() => toggleProductExpansion(product.productId)}
                                      >
                                        <TableCell className="font-medium flex items-center">
                                          {expandedProducts.has(product.productId) ? (
                                            <ChevronUp className="w-4 h-4 mr-2" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 mr-2" />
                                          )}
                                          {product.productName}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatWeight(product.availableQuantity)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatWeight(product.committedQuantity)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                          {formatWeight(product.totalQuantity)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="outline">{product.lotCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Badge 
                                            variant={getStockStatus(product.availableQuantity, product.committedQuantity).variant}
                                          >
                                            {getStockStatus(product.availableQuantity, product.committedQuantity).label}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                      {expandedProducts.has(product.productId) && (
                                        <TableRow>
                                          <TableCell colSpan={7} className="bg-muted/20 p-4">
                                            <div className="space-y-4">
                                              <h5 className="font-semibold text-sm">Lot Details for {product.productName}</h5>
                                              {loadingLots.has(product.productId) ? (
                                                <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                  <span className="ml-2 text-sm text-muted-foreground">Loading lot details...</span>
                                                </div>
                                              ) : productLots[product.productId] ? (
                                                productLots[product.productId].length === 0 ? (
                                                  <div className="text-center py-4 text-muted-foreground">
                                                    No lots found for this product
                                                  </div>
                                                ) : (
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow>
                                                        <TableHead className="text-xs">Lot Number</TableHead>
                                                        <TableHead className="text-right text-xs">Available (kg)</TableHead>
                                                        <TableHead className="text-right text-xs">Committed (kg)</TableHead>
                                                        <TableHead className="text-right text-xs">Total (kg)</TableHead>
                                                        <TableHead className="text-center text-xs">Created Date</TableHead>
                                                        <TableHead className="text-center text-xs">Supplier</TableHead>
                                                        <TableHead className="text-center text-xs">Status</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {productLots[product.productId].map((lot) => (
                                                        <TableRow key={lot.id} className="text-xs">
                                                          <TableCell className="font-mono">
                                                            {lot.lotNumber}
                                                          </TableCell>
                                                          <TableCell className="text-right font-mono">
                                                            {formatWeight(lot.availableQuantity)}
                                                          </TableCell>
                                                          <TableCell className="text-right font-mono">
                                                            {formatWeight(lot.committedQuantity)}
                                                          </TableCell>
                                                          <TableCell className="text-right font-mono font-semibold">
                                                            {formatWeight(lot.totalQuantity)}
                                                          </TableCell>
                                                          <TableCell className="text-center text-xs">
                                                            {lot.createdAt ? (() => {
                                                              try {
                                                                const date = new Date(lot.createdAt);
                                                                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                                                              } catch {
                                                                return 'Invalid Date';
                                                              }
                                                            })() : 'N/A'}
                                                          </TableCell>
                                                          <TableCell className="text-center">
                                                            <span className="text-xs">{lot.supplierName || 'N/A'}</span>
                                                          </TableCell>
                                                          <TableCell className="text-center">
                                                            <Badge 
                                                              variant={getStockStatus(lot.availableQuantity, lot.committedQuantity).variant}
                                                              className="text-xs"
                                                            >
                                                              {getStockStatus(lot.availableQuantity, lot.committedQuantity).label}
                                                            </Badge>
                                                          </TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                )
                                              ) : (
                                                <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                  <span className="ml-2 text-sm text-muted-foreground">Loading lot details...</span>
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}