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
import { Factory } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Local type definitions for Supplier
type Supplier = {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
};

type InsertSupplier = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;

// Validation schema for supplier
const insertSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});

import { useToast } from "@/hooks/use-toast";

// Function to extract PAN from GST number
const extractPanFromGst = (gstNumber: string): string => {
  // Remove all spaces and convert to uppercase
  const cleanGst = gstNumber.replace(/\s+/g, '').toUpperCase();
  
  // Check if it's a valid 15-digit GSTIN format
  if (cleanGst.length === 15 && /^[0-9A-Z]{15}$/.test(cleanGst)) {
    // Extract PAN from positions 3-12 (0-indexed: positions 2-11)
    return cleanGst.substring(2, 12);
  }
  
  return '';
};

const supplierColumns: DataTableColumn[] = [
  { key: "id", label: "ID", type: "number", sortable: true },
  { key: "name", label: "Supplier Name", type: "text", searchable: true, sortable: true },
  { key: "contactPerson", label: "Contact Person", type: "text", searchable: true },
  { key: "phone", label: "Phone", type: "text", searchable: true },
  { key: "email", label: "Email", type: "text", searchable: true },
  { key: "gstNumber", label: "GST Number", type: "text", searchable: true },
  { key: "panNumber", label: "PAN Number", type: "text", searchable: true },
  { 
    key: "createdAt", 
    label: "Created", 
    type: "date", 
    sortable: true,
    format: (value) => {
      try {
        if (!value) return "N/A";
        // Handle ISO date string with Z suffix
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
        // Handle ISO date string with Z suffix
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

export default function Suppliers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      panNumber: "",
      isActive: true,
    },
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSupplier) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create supplier: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSupplier> }) =>
      apiRequest("PUT", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update supplier: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete supplier: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertSupplier) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        gstNumber: supplier.gstNumber || "",
        panNumber: supplier.panNumber || "",
        isActive: supplier.isActive !== false,
      });
    } else {
      setEditingSupplier(null);
      form.reset({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        panNumber: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => openDialog();
  const handleEdit = (supplier: Supplier) => openDialog(supplier);
  const handleDelete = (supplier: Supplier) => deleteMutation.mutate(supplier.id);

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Factory className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier directory</p>
        </div>
      </div>

      <DataTable
        title="Suppliers"
        data={suppliers as Supplier[] || []}
        columns={supplierColumns}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Search suppliers by name, contact, phone, or email..."
        enablePagination={true}
        defaultRowsPerPage={10}
        hideHeader={true}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name" {...field} />
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
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
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter GST number" 
                        {...field} 
                        onChange={(e) => {
                          const gstValue = e.target.value;
                          field.onChange(gstValue);
                          
                          // Auto-fill PAN if GST is provided and current PAN is empty
                          if (gstValue && !form.getValues('panNumber')) {
                            const extractedPan = extractPanFromGst(gstValue);
                            if (extractedPan) {
                              form.setValue('panNumber', extractedPan);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PAN number" {...field} />
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
                    : editingSupplier
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