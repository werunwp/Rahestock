import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProducts, Product, CreateProductData } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useProductVariants, AttributeDefinition } from "@/hooks/useProductVariants";
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

// Variations state
const [hasVariants, setHasVariants] = useState<boolean>(product?.has_variants ?? false);
const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
type VariantFormRow = { sku?: string; rate?: number | null; cost?: number | null; quantity: number; low_stock_threshold?: number | null; image_url?: string };
const [variantState, setVariantState] = useState<Record<string, VariantFormRow>>({});
const [bulkRate, setBulkRate] = useState<string>("");
const [bulkCost, setBulkCost] = useState<string>("");
const [bulkLow, setBulkLow] = useState<string>("");

const setVariant = (key: string, patch: Partial<VariantFormRow>) => {
  setVariantState((prev) => ({
    ...prev,
    [key]: { quantity: 0, ...prev[key], ...patch },
  }));
};

const applyBulk = () => {
  const r = bulkRate ? parseFloat(bulkRate) : undefined;
  const c = bulkCost ? parseFloat(bulkCost) : undefined;
  const l = bulkLow ? parseInt(bulkLow) : undefined;
  const next: Record<string, VariantFormRow> = {};
  combos.forEach((attrs) => {
    const key = JSON.stringify(attrs);
    const cur = variantState[key] || { quantity: 0 };
    next[key] = {
      ...cur,
      rate: r ?? cur.rate ?? formData.rate,
      cost: c ?? cur.cost ?? (formData.cost || null),
      low_stock_threshold: l ?? cur.low_stock_threshold ?? formData.low_stock_threshold,
    };
  });
  setVariantState(next);
};

const { variants: existingVariants, isLoading: variantsLoading, bulkUpsert, clearVariants } = useProductVariants(product?.id);

const combos = useMemo(() => {
  if (!attributes.length) return [] as Array<Record<string,string>>;
  const lists = attributes.map(a => a.values.filter(v => v?.trim()).map(v => ({ [a.name]: v.trim() })));
  if (lists.some(l => l.length === 0)) return [] as Array<Record<string,string>>;
  // cartesian product of list of objects where we merge keys
  return lists.reduce((acc, list) => {
    const out: Array<Record<string,string>> = [];
    for (const a of acc) {
      for (const b of list) {
        out.push({ ...a, ...b });
      }
    }
    return out;
  }, [{} as Record<string,string>]);
}, [attributes]);

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
      has_variants: product.has_variants,
    });
    setHasVariants(!!product.has_variants);
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
      has_variants: false,
    });
    setHasVariants(false);
  }
}, [product]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    if (hasVariants) {
      if (isEditing && product) {
        // Update product base fields, mark has_variants
        await updateProduct.mutateAsync({ id: product.id, data: { ...formData, has_variants: true } });
        // Prepare variants payload
        const variantPayload = combos.map((attrs) => {
          const key = JSON.stringify(attrs);
          const v = variantState[key] || { quantity: 0 };
          return {
            product_id: product.id,
            attributes: attrs,
            sku: v.sku || null,
            rate: v.rate ?? null,
            cost: v.cost ?? null,
            stock_quantity: v.quantity || 0,
            low_stock_threshold: v.low_stock_threshold ?? null,
            image_url: v.image_url || null,
          };
        });
        await bulkUpsert.mutateAsync({
          productId: product.id,
          hasVariants: true,
          attributes,
          variants: variantPayload as any,
        });
      } else {
        // Create base product first
        const created = await createProduct.mutateAsync({ ...formData, has_variants: true, stock_quantity: 0 });
        const productId = (created as any)?.id;
        if (productId) {
          const variantPayload = combos.map((attrs) => {
            const key = JSON.stringify(attrs);
            const v = variantState[key] || { quantity: 0 };
            return {
              product_id: productId,
              attributes: attrs,
              sku: v.sku || null,
              rate: v.rate ?? null,
              cost: v.cost ?? null,
              stock_quantity: v.quantity || 0,
              low_stock_threshold: v.low_stock_threshold ?? null,
              image_url: v.image_url || null,
            };
          });
          await bulkUpsert.mutateAsync({ productId, hasVariants: true, attributes, variants: variantPayload as any });
        }
      }
    } else {
      // No variants path
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, data: { ...formData, has_variants: false } });
        if (product.has_variants) {
          await clearVariants.mutateAsync(product.id);
        }
      } else {
        await createProduct.mutateAsync({ ...formData, has_variants: false });
      }
    }
    onOpenChange(false);
  } catch (error) {
    // handled in hooks
  }
};

  const handleChange = (field: keyof CreateProductData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]">
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