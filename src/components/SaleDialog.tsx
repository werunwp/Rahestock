import { useSales } from "@/hooks/useSales";
import { BaseSaleDialog, type SaleFormData } from "./BaseSaleDialog";

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaleDialog = ({ open, onOpenChange }: SaleDialogProps) => {
  const { createSale } = useSales();

  const handleSubmit = async (data: SaleFormData, calculatedValues: {
    subtotal: number;
    discountAmount: number;
    grandTotal: number;
    amountDue: number;
  }) => {
    try {
      await createSale.mutateAsync({
        customer_id: data.customerId || null,
        customer_name: data.customerName,
        customer_phone: data.customerPhone || null,
        customer_whatsapp: data.customerWhatsapp || null,
        customer_address: data.customerAddress || null,
        additional_info: data.additional_info || null,
        payment_method: data.paymentMethod,
        payment_status: data.paymentStatus,
        amount_paid: data.amountPaid,
        discount_percent: data.discountPercent,
        discount_amount: calculatedValues.discountAmount,
        fee: data.charge || 0,
        subtotal: calculatedValues.subtotal,
        grand_total: calculatedValues.grandTotal,
        amount_due: calculatedValues.amountDue,
        items: data.items.map(item => ({
          product_id: item.productId || item.product_id!,
          product_name: item.productName || item.product_name!,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total,
          variant_id: (item.variantId || item.variant_id) ?? null,
        })),
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  return (
    <BaseSaleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Sale"
      isEditing={false}
      onSubmit={handleSubmit}
    />
  );
};