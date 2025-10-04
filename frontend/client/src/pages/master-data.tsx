import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";
import { masterDataApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Tags, Building, Users, Truck, Package2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MasterData() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("products");

  const productsQuery = useRetryableQuery({
    queryKey: ["/api/products"],
    staleTime: 60 * 1000, // 1 minute
  });

  const locationsQuery = useRetryableQuery({
    queryKey: ["/api/locations"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const suppliersQuery = useRetryableQuery({
    queryKey: ["/api/suppliers"],
    staleTime: 60 * 1000, // 1 minute
  });

  const customersQuery = useRetryableQuery({
    queryKey: ["/api/customers"],
    staleTime: 60 * 1000, // 1 minute
  });

  const processorsQuery = useRetryableQuery({
    queryKey: ["/api/processors"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract data with fallbacks from response objects
  const products = productsQuery.data?.products || [];
  const locations = locationsQuery.data?.locations || [];
  const suppliers = suppliersQuery.data?.suppliers || [];
  const customers = customersQuery.data?.customers || [];
  const processors = processorsQuery.data?.processors || [];
  const productsLoading = productsQuery.isLoading;
  const locationsLoading = locationsQuery.isLoading;
  const suppliersLoading = suppliersQuery.isLoading;
  const customersLoading = customersQuery.isLoading;
  const processorsLoading = processorsQuery.isLoading;

  const getProductName = (productId: number) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.name : "Unknown Product";
  };

  const renderProductsTab = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Package2 className="w-5 h-5 mr-2" />
          Products
        </CardTitle>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </CardHeader>
      <CardContent>
        {productsLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.length > 0 ? (
                products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono">{product.hsnCode || "N/A"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "secondary" : "outline"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No products found. Add your first product.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );



  const renderLocationsTab = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Warehouse Locations
        </CardTitle>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </CardHeader>
      <CardContent>
        {locationsLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations?.length > 0 ? (
                locations.map((location: any) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.address || "No address"}
                    </TableCell>
                    <TableCell>{location.contactPerson || "N/A"}</TableCell>
                    <TableCell className="font-mono">{location.phone || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={location.isActive ? "secondary" : "outline"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No locations found. Add your first warehouse location.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const renderCustomersTab = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Customers
        </CardTitle>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </CardHeader>
      <CardContent>
        {customersLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.length > 0 ? (
                customers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.contactPerson || "N/A"}</TableCell>
                    <TableCell className="font-mono">{customer.phone || "N/A"}</TableCell>
                    <TableCell>{customer.email || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "secondary" : "outline"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No customers found. Add your first customer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const renderSuppliersTab = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Suppliers
        </CardTitle>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </CardHeader>
      <CardContent>
        {suppliersLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.length > 0 ? (
                suppliers.map((supplier: any) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contactPerson || "N/A"}</TableCell>
                    <TableCell className="font-mono">{supplier.phone || "N/A"}</TableCell>
                    <TableCell>{supplier.email || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={supplier.isActive ? "secondary" : "outline"}>
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No suppliers found. Add your first supplier.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Tags className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Master Data</h1>
          <p className="text-muted-foreground">Manage products, locations, customers and suppliers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="products">{renderProductsTab()}</TabsContent>
          <TabsContent value="locations">{renderLocationsTab()}</TabsContent>
          <TabsContent value="customers">{renderCustomersTab()}</TabsContent>
          <TabsContent value="suppliers">{renderSuppliersTab()}</TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
