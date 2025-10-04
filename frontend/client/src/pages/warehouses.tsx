import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError } from "@/components/LoadingStates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Local type definitions for Location
type Location = {
  id: number;
  name: string;
  code?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  capacity?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type InsertLocation = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;

// Validation schema for location
const insertLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

import { useToast } from "@/hooks/use-toast";

const warehouseColumns: DataTableColumn[] = [
  { key: "id", label: "ID", type: "number", sortable: true },
  { key: "name", label: "Warehouse Name", type: "text", searchable: true, sortable: true },
  { key: "address", label: "Address", type: "text", searchable: true },
  { key: "contactPerson", label: "Contact Person", type: "text", searchable: true },
  { key: "phone", label: "Phone", type: "text", searchable: true },
  { 
    key: "createdAt", 
    label: "Created", 
    type: "date", 
    sortable: true,
    format: (value) => {
      try {
        if (!value) return "N/A";
        const cleanValue = value.replace(/Z$/, '');
        const date = new Date(cleanValue);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
      } catch {
        return "N/A";
      }
    }
  },
  { 
    key: "createdBy", 
    label: "Created By", 
    type: "text", 
    sortable: true,
    format: (value) => value ? `User ${value}` : "N/A"
  },
  { 
    key: "updatedAt", 
    label: "Updated", 
    type: "date", 
    sortable: true,
    format: (value) => {
      try {
        if (!value) return "N/A";
        const cleanValue = value.replace(/Z$/, '');
        const date = new Date(cleanValue);
        return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
      } catch {
        return "N/A";
      }
    }
  },
  { 
    key: "updatedBy", 
    label: "Updated By", 
    type: "text", 
    sortable: true,
    format: (value) => value ? `User ${value}` : "N/A"
  }
];

export default function Warehouses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Location | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: "",
      address: "",
      contactPerson: "",
      phone: "",
      isActive: true,
    },
  });

  const warehousesQuery = useRetryableQuery({
    queryKey: ["/api/locations"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const warehouses = warehousesQuery.data?.warehouses || [];
  const isLoading = warehousesQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: (data: InsertLocation) => apiRequest("POST", "/api/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create warehouse: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertLocation> }) =>
      apiRequest("PUT", `/api/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsDialogOpen(false);
      setEditingWarehouse(null);
      form.reset();
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update warehouse: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete warehouse: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertLocation) => {
    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (warehouse?: Location) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      form.reset({
        name: warehouse.name,
        address: warehouse.address || "",
        contactPerson: warehouse.contactPerson || "",
        phone: warehouse.phone || "",
        isActive: warehouse.isActive !== false,
      });
    } else {
      setEditingWarehouse(null);
      form.reset({
        name: "",
        address: "",
        contactPerson: "",
        phone: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => openDialog();
  const handleEdit = (warehouse: Location) => openDialog(warehouse);
  const handleDelete = (warehouse: Location) => deleteMutation.mutate(warehouse.id);

  // Handle loading states and errors
  if (warehousesQuery.isError) {
    return (
      <div className="p-6">
        <RetryableError 
          error={warehousesQuery.error}
          onRetry={() => warehousesQuery.refetch()}
          context="warehouses data"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Building className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Warehouses</h1>
          <p className="text-muted-foreground">Manage your warehouse locations</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading warehouses..." />
      ) : (
        <DataTable
          title="Warehouses"
          data={warehouses as Location[] || []}
          columns={warehouseColumns}
          isLoading={isLoading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search warehouses by name, code, address, or contact..."
          enablePagination={true}
          defaultRowsPerPage={10}
          hideHeader={true}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter warehouse name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter complete address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Capacity</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter storage capacity (e.g., 1000 MT)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingWarehouse
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}