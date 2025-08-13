import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSales, type UpdateSaleData } from "@/hooks/useSales";
import { useCurrency } from "@/hooks/useCurrency";
import { useProductVariants } from "@/hooks/useProductVariants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

interface SaleItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total: number;
  variant_id?: string | null;
  variantLabel?: string;
  maxStock?: number;
}

interface SaleFormData {
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  customer_address?: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  payment_method: string;
  payment_status: string;
  items: SaleItem[];
}

export const EditSaleDialog = ({ open, onOpenChange, saleId }: EditSaleDialogProps) => {
  const [formData, setFormData] = useState<SaleFormData>({
    customer_name: "",
    subtotal: 0,
    discount_percent: 0,
    discount_amount: 0,
    grand_total: 0,
    amount_paid: 0,
    amount_due: 0,
    payment_method: "cash",
    payment_status: "pending",
    items: []
  });
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [isLoading, setIsLoading] = useState(false);

  const { products } = useProducts();
  const { customers } = useCustomers();
  const { updateSale, getSaleWithItems } = useSales();
  const { formatAmount, currencySymbol } = useCurrency();

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const { variants: currentVariants = [] } = useProductVariants(selectedProduct?.has_variants ? selectedProductId : undefined as any);

  useEffect(() => {
    if (!open || !saleId) {
      setFormData({
        customer_name: "",
        subtotal: 0,
        discount_percent: 0,
        discount_amount: 0,
        grand_total: 0,
        amount_paid: 0,
        amount_due: 0,
        payment_method: "cash",
        payment_status: "pending",
        items: []
      });
      return;
    }

    const loadSaleData = async () => {
      try {
        setIsLoading(true);
        const saleWithItems = await getSaleWithItems(saleId);

        // Build items and hydrate variant labels and stock in one batch
        const baseItems = saleWithItems.items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total,
          variant_id: item.variant_id || null,
        } as SaleItem));

        const variantIds = baseItems.filter(i => i.variant_id).map(i => i.variant_id!) as string[];
        let variantMap: Record<string, { label: string; stock: number }> = {};
        if (variantIds.length > 0) {
          const { data: vars, error: varErr } = await supabase
            .from("product_variants")
            .select("id, attributes, stock_quantity")
            .in("id", variantIds);
          if (varErr) throw varErr;
          variantMap = (vars || []).reduce((acc: any, v: any) => {
            const label = Object.entries(v.attributes || {})
              .map(([_, val]) => `${val}`)
              .join(" / ");
            acc[v.id] = { label, stock: v.stock_quantity || 0 };
            return acc;
          }, {});
        }

        const enrichedItems: SaleItem[] = baseItems.map(i =>
          i.variant_id
            ? {
                ...i,
                variantLabel: variantMap[i.variant_id]?.label,
                maxStock: variantMap[i.variant_id]?.stock,
              }
            : i
        );

        setFormData({
          customer_id: saleWithItems.customer_id || undefined,
          customer_name: saleWithItems.customer_name,
          customer_phone: saleWithItems.customer_phone || undefined,
          customer_whatsapp: saleWithItems.customer_whatsapp || undefined,
          customer_address: saleWithItems.customer_address || undefined,
          subtotal: saleWithItems.subtotal,
          discount_percent: saleWithItems.discount_percent,
          discount_amount: saleWithItems.discount_amount,
          grand_total: saleWithItems.grand_total,
          amount_paid: saleWithItems.amount_paid,
          amount_due: saleWithItems.amount_due,
          payment_method: saleWithItems.payment_method,
          payment_status: saleWithItems.payment_status,
          items: enrichedItems,
        });
      } catch (error) {
        toast.error("Failed to load sale data");
      } finally {
        setIsLoading(false);
      }
    };

    loadSaleData();
  }, [open, saleId]); // Removed getSaleWithItems from dependencies

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percent" 
    ? (subtotal * formData.discount_percent) / 100 
    : formData.discount_amount;
  const grandTotal = subtotal - discountAmount;
  const amountDue = grandTotal - formData.amount_paid;

  // Auto-update payment status based on amount paid
  useEffect(() => {
    if (formData.amount_paid === 0) {
      setFormData(prev => ({ ...prev, payment_status: "pending" }));
    } else if (formData.amount_paid >= grandTotal) {
      setFormData(prev => ({ ...prev, payment_status: "paid" }));
    } else {
      setFormData(prev => ({ ...prev, payment_status: "partial" }));
    }
  }, [formData.amount_paid, grandTotal]);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer.name,
        customer_phone: customer.phone || "",
        customer_whatsapp: customer.whatsapp || "",
        customer_address: customer.address || "",
      }));
    }
  };

  const addProduct = () => {
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

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

      const existingIndex = formData.items.findIndex(
        i => i.product_id === product.id && i.variant_id === selectedVariantId
      );
      const rate = (variant.rate ?? product.rate) as number;
      if (existingIndex >= 0) {
        const existing = formData.items[existingIndex];
        const newQty = Math.min(existing.quantity + 1, maxStock);
        updateQuantity(existingIndex, newQty);
      } else {
        const label = Object.entries(variant.attributes || {})
          .map(([_, v]) => `${v}`)
          .join(" / ");
        const newItem: SaleItem = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          rate,
          total: rate,
          variant_id: variant.id,
          variantLabel: label,
          maxStock,
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
      }
    } else {
      const existingItemIndex = formData.items.findIndex(item => item.product_id === selectedProductId);
      if (existingItemIndex >= 0) {
        updateQuantity(existingItemIndex, formData.items[existingItemIndex].quantity + 1);
      } else {
        const newItem: SaleItem = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          rate: product.rate,
          total: product.rate,
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
      }
    }

    setSelectedProductId("");
    setSelectedVariantId(null);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, quantity: newQuantity, total: newQuantity * item.rate }
          : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!saleId) return;
    
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (!formData.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      const updateData: UpdateSaleData = {
        id: saleId,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_whatsapp: formData.customer_whatsapp,
        customer_address: formData.customer_address,
        subtotal,
        discount_percent: discountType === "percent" ? formData.discount_percent : 0,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        amount_paid: formData.amount_paid,
        amount_due: amountDue,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        items: formData.items
      };

      await updateSale.mutateAsync(updateData);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">Loading sale data...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Sale</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select onValueChange={handleCustomerSelect} value={formData.customer_id || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.phone && `- ${customer.phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_address">Address</Label>
                  <Input
                    id="customer_address"
                    value={formData.customer_address || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {currencySymbol}{product.rate} (Stock: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addProduct} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selected Products */}
          {formData.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={`${item.product_id}-${index}`}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{formatAmount(item.rate)}</TableCell>
                        <TableCell>{formatAmount(item.total)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payment & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const cappedValue = Math.min(value, grandTotal);
                      setFormData(prev => ({ ...prev, amount_paid: cappedValue }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select 
                    value={formData.payment_status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}
                  >
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(value: "percent" | "amount") => setDiscountType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discountType === "percent" ? (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: parseFloat(e.target.value) || 0 }))}
                      placeholder="Discount %"
                    />
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="Discount Amount"
                    />
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatAmount(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatAmount(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Grand Total:</span>
                    <span>{formatAmount(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>{formatAmount(formData.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Due:</span>
                    <Badge variant={amountDue > 0 ? "destructive" : "default"}>
                      {formatAmount(amountDue)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSale.isPending}>
              {updateSale.isPending ? "Updating..." : "Update Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};