import { BusinessSettings } from "@/hooks/useBusinessSettings";
import { SystemSettings } from "@/hooks/useSystemSettings";
import { processInvoiceTemplate, DEFAULT_INVOICE_TEMPLATE } from "./invoiceTemplate";

interface SaleData {
  id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_email?: string;
  subtotal: number;
  discount_percent?: number;
  discount_amount?: number;
  grand_total: number;
  amount_paid?: number;
  amount_due?: number;
  payment_method: string;
  sale_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    rate: number;
    total: number;
    variant_id?: string;
  }>;
}

export const generateInvoiceHtml = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  customTemplate?: string
): string => {
  const template = customTemplate || DEFAULT_INVOICE_TEMPLATE;
  
  return processInvoiceTemplate(
    template,
    sale,
    businessSettings,
    systemSettings
  );
};

export const createPrintableInvoice = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings
): void => {
  const html = generateInvoiceHtml(sale, businessSettings, systemSettings);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
};

export const downloadInvoiceHtml = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  filename?: string
): void => {
  const html = generateInvoiceHtml(sale, businessSettings, systemSettings);
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename || `invoice-${sale.invoice_number}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};