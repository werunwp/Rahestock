import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProducts, Product, CreateProductData } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export const ProductDialog = ({ open, onOpenChange, product }: ProductDialogProps) => {
  const { createProduct, updateProduct } = useProducts();
  const [formData, setFormData] = useState<CreateProductData>({
    name: "",
    sku: "",
    rate: 0,
    cost: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    size: "",
    color: "",
    image_url: "",
  });

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || "",
        rate: product.rate,
        cost: product.cost || 0,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        size: product.size || "",
        color: product.color || "",
        image_url: product.image_url || "",
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        rate: 0,
        cost: 0,
        stock_quantity: 0,
        low_stock_threshold: 10,
        size: "",
        color: "",
        image_url: "",
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await updateProduct.mutateAsync({ id: product.id, data: formData });
      } else {
        await createProduct.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleChange = (field: keyof CreateProductData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the product information below." : "Enter the details for the new product."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              placeholder="Enter SKU"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Selling Price *</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => handleChange("rate", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => handleChange("cost", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock Quantity</Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => handleChange("stock_quantity", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => handleChange("low_stock_threshold", parseInt(e.target.value) || 10)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleChange("size", e.target.value)}
                placeholder="e.g., S, M, L, XL"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                placeholder="e.g., Red, Blue"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Product Image</Label>
            <ImageUpload
              value={formData.image_url}
              onChange={(url) => handleChange("image_url", url)}
              onRemove={() => handleChange("image_url", "")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Update Product" : "Create Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};