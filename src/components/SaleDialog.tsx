import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSales } from "@/hooks/useSales";
import { useCurrency } from "@/hooks/useCurrency";
import { useProductVariants } from "@/hooks/useProductVariants";
import { toast } from "sonner";

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SaleItem {
  productId: string;
  productName: string;
  rate: number;
  quantity: number;
  total: number;
  variantId?: string | null;
  variantLabel?: string;
  maxStock?: number;
}

interface SaleFormData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  customerAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  amountPaid: number;
  discountPercent: number;
  discountAmount: number;
  items: SaleItem[];
}

export const SaleDialog = ({ open, onOpenChange }: SaleDialogProps) => {
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { createSale } = useSales();
  const { formatAmount, currencySymbol } = useCurrency();
  
  const [formData, setFormData] = useState<SaleFormData>({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerWhatsapp: "",
    customerAddress: "",
    paymentMethod: "cash",
    paymentStatus: "pending",
    amountPaid: 0,
    discountPercent: 0,
    discountAmount: 0,
    items: [],
  });

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const { variants: currentVariants = [] } = useProductVariants(selectedProduct?.has_variants ? selectedProductId : undefined as any);

  useEffect(() => {
    if (!open) {
      setFormData({
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerWhatsapp: "",
        customerAddress: "",
        paymentMethod: "cash",
        paymentStatus: "pending",
        amountPaid: 0,
        discountPercent: 0,
        discountAmount: 0,
        items: [],
      });
      setSelectedProductId("");
    }
  }, [open]);

  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percentage" 
    ? (subtotal * formData.discountPercent) / 100 
    : formData.discountAmount;
  const grandTotal = subtotal - discountAmount;
  const amountDue = grandTotal - formData.amountPaid;

  // Auto-update payment status based on amount paid
  useEffect(() => {
    if (formData.amountPaid === 0) {
      setFormData(prev => ({ ...prev, paymentStatus: "pending" }));
    } else if (formData.amountPaid >= grandTotal) {
      setFormData(prev => ({ ...prev, paymentStatus: "paid" }));
    } else {
      setFormData(prev => ({ ...prev, paymentStatus: "partial" }));
    }
  }, [formData.amountPaid, grandTotal]);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone || "",
        customerWhatsapp: customer.whatsapp || "",
        customerAddress: customer.address || "",
      }));
    }
  };

  const addProduct = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // If product has variants, require a specific variant selection
    if (product.has_variants) {
      if (!selectedVariantId) {
        toast.error("Please select a variant");
        return;
      }
      const variant = currentVariants.find(v => v.id === selectedVariantId);
      if (!variant) return;
      const maxStock = variant.stock_quantity || 0;
      if (maxStock <= 0) {
        toast.error("Selected variant is out of stock");
        return;
      }

      const existingItemIndex = formData.items.findIndex(
        i => i.productId === product.id && i.variantId === selectedVariantId
      );
      const rate = (variant.rate ?? product.rate) as number;
      if (existingItemIndex >= 0) {
        const existing = formData.items[existingItemIndex];
        const newQty = Math.min(existing.quantity + 1, maxStock);
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((it, idx) =>
            idx === existingItemIndex ? { ...it, quantity: newQty, total: newQty * rate } : it
          )
        }));
      } else {
        const label = Object.entries(variant.attributes || {})
          .map(([k, v]) => `${v}`)
          .join(" / ");
        setFormData(prev => ({
          ...prev,
          items: [
            ...prev.items,
            {
              productId: product.id,
              productName: product.name,
              rate,
              quantity: 1,
              total: rate,
              variantId: variant.id,
              variantLabel: label,
              maxStock,
            },
          ],
        }));
      }
    } else {
      // Non-variant behavior unchanged
      const existingItem = formData.items.find(item => item.productId === selectedProductId);
      if (existingItem) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.productId === selectedProductId
              ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.rate }
              : item
          ),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          items: [
            ...prev.items,
            {
              productId: product.id,
              productName: product.name,
              rate: product.rate,
              quantity: 1,
              total: product.rate,
            },
          ],
        }));
      }
    }

    setSelectedProductId("");
    setSelectedVariantId(null);
  };

  const updateQuantity = (productId: string, newQuantity: number, variantId?: string | null) => {
    const idx = formData.items.findIndex(i => i.productId === productId && (i.variantId || null) === (variantId || null));
    if (idx === -1) return;

    const item = formData.items[idx];
    const max = item.maxStock ?? Infinity;
    const qty = Math.max(0, Math.min(newQuantity, max));

    if (qty <= 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((it, i) =>
          i === idx ? { ...it, quantity: qty, total: qty * it.rate } : it
        ),
      }));
    }
  };

  const removeItem = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!formData.customerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    try {
      await createSale.mutateAsync({
        customer_id: formData.customerId || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone || null,
        customer_whatsapp: formData.customerWhatsapp || null,
        customer_address: formData.customerAddress || null,
        payment_method: formData.paymentMethod,
        payment_status: formData.paymentStatus,
        amount_paid: formData.amountPaid,
        discount_percent: formData.discountPercent,
        discount_amount: discountAmount,
        subtotal,
        grand_total: grandTotal,
        amount_due: amountDue,
          items: formData.items.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            rate: item.rate,
            total: item.total,
            variant_id: item.variantId ?? null,
          })),
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Sale</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select onValueChange={handleCustomerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Customer phone"
              />
            </div>
            
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={formData.customerWhatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, customerWhatsapp: e.target.value }))}
                placeholder="Customer WhatsApp"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.customerAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
              placeholder="Customer address"
            />
          </div>

          <div className="space-y-4">
            <Label>Add Products</Label>
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={(val) => { setSelectedProductId(val); setSelectedVariantId(null); }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {currencySymbol}{product.rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addProduct} disabled={!selectedProductId || (selectedProduct?.has_variants && !selectedVariantId)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedProduct?.has_variants && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Variant</Label>
                  <Select value={selectedVariantId ?? ""} onValueChange={(v) => setSelectedVariantId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentVariants.map(v => {
                        const label = Object.entries(v.attributes || {}).map(([k, val]) => `${val}`).join(" / ");
                        const disabled = (v.stock_quantity || 0) <= 0;
                        return (
                          <SelectItem key={v.id} value={v.id} disabled={disabled}>
                            {label} — Stock: {v.stock_quantity} {disabled ? "(Out of Stock)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{formatAmount(item.rate)}</TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.productId, Number(e.target.value) || 1)}
                                className="w-16 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                         <TableCell>{formatAmount(item.total)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={formData.paymentStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Discount</Label>
                <div className="flex items-center gap-2">
                  <span className={discountType === "percentage" ? "font-medium" : "text-muted-foreground"}>%</span>
                  <Switch
                    checked={discountType === "fixed"}
                    onCheckedChange={(checked) => setDiscountType(checked ? "fixed" : "percentage")}
                  />
                  <span className={discountType === "fixed" ? "font-medium" : "text-muted-foreground"}>{currencySymbol}</span>
                </div>
              </div>
              <Input
                type="number"
                min="0"
                step={discountType === "percentage" ? "1" : "0.01"}
                max={discountType === "percentage" ? "100" : undefined}
                value={discountType === "percentage" ? formData.discountPercent : formData.discountAmount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (discountType === "percentage") {
                    setFormData(prev => ({ ...prev, discountPercent: value, discountAmount: 0 }));
                  } else {
                    setFormData(prev => ({ ...prev, discountAmount: value, discountPercent: 0 }));
                  }
                }}
                placeholder={discountType === "percentage" ? "Enter percentage" : "Enter amount"}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input
                type="number"
                min="0"
                max={grandTotal}
                step="0.01"
                value={formData.amountPaid}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  const cappedValue = Math.min(value, grandTotal);
                  setFormData(prev => ({ ...prev, amountPaid: cappedValue }));
                }}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatAmount(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatAmount(discountAmount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Grand Total:</span>
              <span>{formatAmount(grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>{formatAmount(formData.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-bold text-destructive">
              <span>Amount Due:</span>
              <span>{formatAmount(amountDue)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSale.isPending}>
              {createSale.isPending ? "Creating..." : "Create Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};