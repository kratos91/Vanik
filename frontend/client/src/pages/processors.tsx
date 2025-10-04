import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError } from "@/components/LoadingStates";
import { masterDataApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
import { DataTable } from "@/components/ui/data-table";
import { Factory, Eye, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const processorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
});

type ProcessorFormData = z.infer<typeof processorSchema>;

export default function Processors() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcessor, setEditingProcessor] = useState<any>(null);
  const [viewingProcessor, setViewingProcessor] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProcessorFormData>({
    resolver: zodResolver(processorSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      panNumber: "",
    },
  });

  const processorsQuery = useRetryableQuery({
    queryKey: ["/api/processors"],
    staleTime: 60 * 1000, // 1 minute
  });

  const processors = processorsQuery.data?.processors || [];
  const isLoading = processorsQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: masterDataApi.createProcessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processors"] });
      toast({ title: "Success", description: "Processor created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create processor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProcessorFormData }) =>
      masterDataApi.updateProcessor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processors"] });
      toast({ title: "Success", description: "Processor updated successfully" });
      setIsDialogOpen(false);
      form.reset();
      setEditingProcessor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update processor",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: masterDataApi.deleteProcessor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processors"] });
      toast({ title: "Success", description: "Processor deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete processor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProcessorFormData) => {
    if (editingProcessor) {
      updateMutation.mutate({ id: editingProcessor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    { key: "id", label: "ID", type: "number", sortable: true },
    {
      key: "name",
      label: "Name",
      type: "text",
      searchable: true,
      sortable: true,
    },
    {
      key: "contactPerson",
      label: "Contact Person",
      type: "text",
      searchable: true,
    },
    {
      key: "phone",
      label: "Phone",
      type: "text",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
    },
    {
      key: "gstNumber",
      label: "GST Number",
      type: "text",
      searchable: true,
    },
    {
      key: "panNumber",
      label: "PAN Number",
      type: "text",
      searchable: true,
    },
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

  const openDialog = (processor?: any) => {
    if (processor) {
      setEditingProcessor(processor);
      form.reset({
        name: processor.name || "",
        contactPerson: processor.contactPerson || "",
        phone: processor.phone || "",
        email: processor.email || "",
        address: processor.address || "",
        gstNumber: processor.gstNumber || "",
        panNumber: processor.panNumber || "",
      });
    } else {
      setEditingProcessor(null);
      form.reset({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        panNumber: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => openDialog();
  const handleEdit = (processor: any) => openDialog(processor);
  const handleDelete = (processor: any) => deleteMutation.mutate(processor.id);

  const handleView = (processor: any) => {
    setViewingProcessor(processor);
    setIsViewDialogOpen(true);
  };

  // Handle loading states and errors
  if (processorsQuery.isError) {
    return (
      <div className="p-6">
        <RetryableError 
          error={processorsQuery.error}
          onRetry={() => processorsQuery.refetch()}
          context="processors data"
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Factory className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Processors</h1>
          <p className="text-muted-foreground">Manage processor master data</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading processors..." />
      ) : (
        <DataTable
          title="Processors"
          data={processors || []}
          columns={columns}
          isLoading={isLoading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search processors by name, contact, phone, or email..."
          enablePagination={true}
          defaultRowsPerPage={10}
          hideHeader={true}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProcessor ? "Edit Processor" : "Add New Processor"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Processor name" {...field} />
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
                        <Input placeholder="Contact person name" {...field} />
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
                        <Input placeholder="Phone number" {...field} />
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
                        <Input placeholder="Email address" {...field} />
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
                        <Textarea placeholder="Full address" {...field} />
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
                          placeholder="GST registration number" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            const gstValue = e.target.value;
                            if (gstValue.length >= 12) {
                              const panValue = gstValue.substring(2, 12);
                              form.setValue('panNumber', panValue);
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
                        <Input placeholder="PAN number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
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
                  {editingProcessor ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Processor Details</DialogTitle>
          </DialogHeader>
          {viewingProcessor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Name</p>
                  <p className="text-sm">{viewingProcessor.name}</p>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Contact Person</p>
                  <p className="text-sm">{viewingProcessor.contactPerson || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm">{viewingProcessor.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Email</p>
                  <p className="text-sm">{viewingProcessor.email || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">GST Number</p>
                  <p className="text-sm">{viewingProcessor.gstNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">PAN Number</p>
                  <p className="text-sm">{viewingProcessor.panNumber || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-sm text-muted-foreground">Address</p>
                <p className="text-sm">{viewingProcessor.address || "N/A"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}