import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { BusinessSettings } from '@/hooks/useBusinessSettings';

interface SaleData {
  id: string;
  invoice_number: string;
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
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
}

export const generateInvoicePDF = async (
  sale: SaleData,
  businessSettings: BusinessSettings
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Helper function to add Bengali font support (using Arial Unicode)
  const addText = (text: string, x: number, y: number, options?: any) => {
    doc.text(text, x, y, options);
  };

  // Header - Business Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  addText(businessSettings.business_name, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Contact Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const contactInfo = [];
  if (businessSettings.phone) contactInfo.push(`Phone: ${businessSettings.phone}`);
  if (businessSettings.whatsapp) contactInfo.push(`WhatsApp: ${businessSettings.whatsapp}`);
  if (businessSettings.email) contactInfo.push(`Email: ${businessSettings.email}`);
  if (businessSettings.facebook) contactInfo.push(`Facebook: ${businessSettings.facebook}`);
  
  const contactText = contactInfo.join(' | ');
  addText(contactText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  if (businessSettings.address) {
    addText(businessSettings.address, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Invoice Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  addText('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Invoice Details - Left Side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addText(`Invoice No: ${sale.invoice_number}`, 20, yPosition);
  addText(`Date: ${format(new Date(sale.created_at), 'dd/MM/yyyy')}`, 20, yPosition + 6);
  
  // Customer Info - Right Side
  const customerStartX = pageWidth - 100;
  addText('Bill To:', customerStartX, yPosition);
  doc.setFont('helvetica', 'bold');
  addText(sale.customer_name, customerStartX, yPosition + 6);
  doc.setFont('helvetica', 'normal');
  
  if (sale.customer_phone) {
    addText(`Phone: ${sale.customer_phone}`, customerStartX, yPosition + 12);
  }
  if (sale.customer_address) {
    addText(`Address: ${sale.customer_address}`, customerStartX, yPosition + 18);
  }
  
  yPosition += 35;

  // Items Table
  const tableColumns = ['Description', 'Qty', 'Rate (৳)', 'Total (৳)'];
  const tableRows = sale.items.map(item => [
    item.product_name,
    item.quantity.toString(),
    item.rate.toFixed(2),
    item.total.toFixed(2)
  ]);

  (doc as any).autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: yPosition,
    margin: { left: 20, right: 20 },
    styles: { 
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: { 
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Totals Section
  const totalsStartX = pageWidth - 80;
  doc.setFont('helvetica', 'normal');
  addText(`Subtotal: ৳${sale.subtotal.toFixed(2)}`, totalsStartX, yPosition);
  yPosition += 6;

  if (sale.discount_amount > 0) {
    addText(`Discount (${sale.discount_percent}%): -৳${sale.discount_amount.toFixed(2)}`, totalsStartX, yPosition);
    yPosition += 6;
  }

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  addText(`Total: ৳${sale.grand_total.toFixed(2)}`, totalsStartX, yPosition);
  yPosition += 8;

  // Payment Information
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  addText(`Advance: ৳${sale.amount_paid.toFixed(2)}`, totalsStartX, yPosition);
  yPosition += 6;
  addText(`Due: ৳${sale.amount_due.toFixed(2)}`, totalsStartX, yPosition);
  yPosition += 15;

  // Signature Section
  const signatureY = Math.max(yPosition, pageHeight - 60);
  
  // Customer Signature
  addText('Customer Signature', 30, signatureY);
  doc.line(30, signatureY + 5, 100, signatureY + 5);
  
  // Merchant Signature
  addText('Merchant Signature', pageWidth - 100, signatureY);
  doc.line(pageWidth - 100, signatureY + 5, pageWidth - 30, signatureY + 5);

  // Footer Message
  if (businessSettings.invoice_footer_message) {
    doc.setFontSize(9);
    addText(businessSettings.invoice_footer_message, pageWidth / 2, signatureY + 20, { align: 'center' });
  }

  return doc;
};

export const downloadInvoicePDF = async (
  sale: SaleData,
  businessSettings: BusinessSettings
) => {
  try {
    const doc = await generateInvoicePDF(sale, businessSettings);
    const filename = `invoice_${sale.invoice_number}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const printInvoicePDF = async (
  sale: SaleData,
  businessSettings: BusinessSettings
) => {
  try {
    const doc = await generateInvoicePDF(sale, businessSettings);
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, '_blank');
    if (!printWindow) {
      throw new Error('Please allow popups to print invoices');
    }
    
    printWindow.onload = () => {
      printWindow.print();
    };
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
};