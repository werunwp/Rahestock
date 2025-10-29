import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers, Customer, CreateCustomerData } from "@/hooks/useCustomers";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export const CustomerDialog = ({ open, onOpenChange, customer }: CustomerDialogProps) => {
  const { createCustomer, updateCustomer } = useCustomers();
  const { hasPermission } = useUserRole();
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: "",
    phone: "",
    whatsapp: "",
    address: "",
    tags: [],
    status: "inactive",
    additional_info: "",
  });

  const isEditing = !!customer;
  const canAddCustomer = hasPermission('customers.add');
  const canEditCustomer = hasPermission('customers.edit');
  const canSave = isEditing ? canEditCustomer : canAddCustomer;

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || "",
        whatsapp: customer.whatsapp || "",
        address: customer.address || "",
        tags: customer.tags || [],
        status: customer.status || "inactive",
        additional_info: customer.additional_info || "",
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        whatsapp: "",
        address: "",
        tags: [],
        status: "inactive",
        additional_info: "",
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSave) return;
    
    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({ id: customer.id, data: formData });
      } else {
        await createCustomer.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleChange = (field: keyof CreateCustomerData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the customer information below." : "Enter the details for the new customer."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter customer name"
              required
              disabled={!canSave}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="Enter phone number"
              disabled={!canSave}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="Enter WhatsApp number"
              disabled={!canSave}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Enter customer address"
              rows={3}
              disabled={!canSave}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange("status", value)} disabled={!canSave}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_info">Additional Info</Label>
            <Input
              id="additional_info"
              value={formData.additional_info || ""}
              onChange={(e) => handleChange("additional_info", e.target.value)}
              placeholder="Enter any additional information (e.g., VIP, Wholesale, Notes, etc.)"
              disabled={!canSave}
            />
            <p className="text-xs text-muted-foreground">
              Enter any additional information or notes for this customer
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {canSave && (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Customer" : "Create Customer"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};