import { useState, useEffect } from "react";
import { useSales, type UpdateSaleData } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BaseSaleDialog, type SaleFormData, type SaleItem } from "./BaseSaleDialog";

interface EditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

export const EditSaleDialog = ({ open, onOpenChange, saleId }: EditSaleDialogProps) => {
  const [initialData, setInitialData] = useState<SaleFormData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const { updateSale, getSaleWithItems } = useSales();

  useEffect(() => {
    if (!open || !saleId) {
      setInitialData(undefined);
      setIsLoading(false);
      return;
    }

    const loadSaleData = async () => {
      try {
        setIsLoading(true);
        const saleWithItems = await getSaleWithItems(saleId);

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

        setInitialData({
          customerId: saleWithItems.customer_id || "",
          customerName: saleWithItems.customer_name,
          customerPhone: saleWithItems.customer_phone || "",
          customerWhatsapp: saleWithItems.customer_whatsapp || "",
          customerAddress: saleWithItems.customer_address || "",
          paymentMethod: saleWithItems.payment_method,
          paymentStatus: saleWithItems.payment_status,
          amountPaid: saleWithItems.amount_paid,
          discountPercent: saleWithItems.discount_percent,
          discountAmount: saleWithItems.discount_amount,
          fee: 0,
          items: enrichedItems,
        });
      } catch (error) {
        console.error("Error loading sale data:", error);
        toast.error("Failed to load sale data");
      } finally {
        setIsLoading(false);
      }
    };

    loadSaleData();
  }, [open, saleId, getSaleWithItems]);

  const handleSubmit = async (data: SaleFormData, calculatedValues: {
    subtotal: number;
    discountAmount: number;
    grandTotal: number;
    amountDue: number;
  }) => {
    if (!saleId) return;

    try {
      const updateData: UpdateSaleData = {
        id: saleId,
        customer_id: data.customerId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_whatsapp: data.customerWhatsapp,
        customer_address: data.customerAddress,
        subtotal: calculatedValues.subtotal,
        discount_percent: data.discountPercent,
        discount_amount: calculatedValues.discountAmount,
        fee: data.fee || 0,
        grand_total: calculatedValues.grandTotal,
        amount_paid: data.amountPaid,
        amount_due: calculatedValues.amountDue,
        payment_method: data.paymentMethod,
        payment_status: data.paymentStatus,
        items: data.items.map(item => ({
          id: item.id,
          product_id: item.productId || item.product_id!,
          product_name: item.productName || item.product_name!,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total,
          variant_id: (item.variantId || item.variant_id) ?? null,
        }))
      };

      await updateSale.mutateAsync(updateData);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <BaseSaleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Sale"
      isEditing={true}
      initialData={initialData}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
};