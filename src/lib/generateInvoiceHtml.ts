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

// New function to convert HTML to PDF and download
export const downloadInvoicePDFFromHtml = async (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  filename?: string
): Promise<void> => {
  const html = generateInvoiceHtml(sale, businessSettings, systemSettings);
  
  // Create a new window/iframe to render the HTML for PDF conversion
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  
  document.body.appendChild(iframe);
  
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Could not access iframe document');
    
    doc.open();
    doc.write(html);
    doc.close();
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use the browser's print functionality to generate PDF
    const printWindow = iframe.contentWindow;
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(iframe);
  }
};