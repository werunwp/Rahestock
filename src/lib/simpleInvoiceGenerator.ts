import { BusinessSettings } from "@/hooks/useBusinessSettings";
import { SystemSettings } from "@/hooks/useSystemSettings";

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

// Function to format currency
const formatCurrency = (amount: number, currencySymbol: string = '৳'): string => {
  return `${currencySymbol}${amount.toFixed(2)}`;
};

// Function to format date
const formatDate = (dateString: string, format: string = 'dd/MM/yyyy'): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString());
};

// Generate HTML invoice that exactly matches your PDF template design
export const generateInvoiceHTML = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings
): string => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${sale.invoice_number}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 0;
            background-color: white;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .invoice-page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 0;
            box-sizing: border-box;
            position: relative;
            background: white;
            overflow: hidden;
        }
        
        /* Header section with business info on left, invoice title on right */
        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20mm 20mm 0 20mm;
            margin-bottom: 20mm;
            border-bottom: 2px solid #000;
            padding-bottom: 15mm;
        }
        
        .business-info {
            flex: 1;
            max-width: 50%;
        }
        
        .business-name {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 6mm;
            color: #000;
            line-height: 1.2;
        }
        
        .business-details {
            font-size: 9pt;
            color: #333;
            line-height: 1.3;
        }
        
        .business-details div {
            margin-bottom: 2mm;
        }
        
        .invoice-title-section {
            text-align: right;
            flex: 1;
            max-width: 50%;
        }
        
        .invoice-title {
            font-size: 24pt;
            font-weight: bold;
            margin: 0 0 10mm 0;
            color: #000;
            text-transform: uppercase;
        }
        
        .invoice-details {
            font-size: 9pt;
            text-align: right;
        }
        
        .invoice-details div {
            margin-bottom: 2mm;
        }
        
        /* Customer section */
        .customer-section {
            padding: 0 20mm;
            margin-bottom: 20mm;
        }
        
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 5mm;
            color: #000;
            text-transform: uppercase;
        }
        
        .customer-info {
            font-size: 9pt;
            line-height: 1.4;
        }
        
        .customer-info div {
            margin-bottom: 2mm;
        }
        
        /* Items table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 20mm 15mm 20mm;
        }
        
        .items-table th {
            background-color: #f0f0f0;
            padding: 3mm 2mm;
            text-align: left;
            border: 1px solid #000;
            font-weight: bold;
            font-size: 9pt;
        }
        
        .items-table td {
            padding: 2mm;
            border: 1px solid #000;
            font-size: 9pt;
            vertical-align: top;
        }
        
        .item-name {
            width: 45%;
        }
        
        .item-quantity {
            width: 15%;
            text-align: center;
        }
        
        .item-rate {
            width: 20%;
            text-align: right;
        }
        
        .item-total {
            width: 20%;
            text-align: right;
        }
        
        /* Totals section - positioned on the right */
        .totals-section {
            margin-left: auto;
            width: 60mm;
            margin-right: 20mm;
            margin-bottom: 15mm;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3mm;
            font-size: 9pt;
            padding: 1mm 0;
        }
        
        .total-label {
            font-weight: bold;
        }
        
        .grand-total {
            font-size: 11pt;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 3mm;
            margin-top: 3mm;
        }
        
        /* Payment info section */
        .payment-info {
            margin: 0 20mm;
            padding: 5mm;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 2mm;
            font-size: 9pt;
        }
        
        .payment-info div {
            margin-bottom: 2mm;
        }
        
        /* Footer */
        .footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 5mm;
        }
        
        /* Print styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .invoice-page {
                margin: 0;
                padding: 0;
            }
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 210mm) {
            .invoice-page {
                width: 100%;
                height: auto;
                min-height: 297mm;
            }
            
            .header-section,
            .customer-section,
            .items-table,
            .totals-section,
            .payment-info {
                margin-left: 5mm;
                margin-right: 5mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-page">
        <div class="header-section">
            <div class="business-info">
                <div class="business-name">${businessSettings.business_name || ''}</div>
                <div class="business-details">
                    ${businessSettings.address ? `<div>${businessSettings.address}</div>` : ''}
                    ${businessSettings.address_line1 ? `<div>${businessSettings.address_line1}</div>` : ''}
                    ${businessSettings.address_line2 ? `<div>${businessSettings.address_line2}</div>` : ''}
                    ${businessSettings.phone ? `<div>Phone: ${businessSettings.phone}</div>` : ''}
                    ${businessSettings.email ? `<div>Email: ${businessSettings.email}</div>` : ''}
                    ${businessSettings.whatsapp ? `<div>WhatsApp: ${businessSettings.whatsapp}</div>` : ''}
                    ${businessSettings.facebook ? `<div>Facebook: ${businessSettings.facebook}</div>` : ''}
                </div>
            </div>
            
            <div class="invoice-title-section">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-details">
                    <div><strong>Invoice #:</strong> ${sale.invoice_number}</div>
                    <div><strong>Date:</strong> ${formatDate(sale.created_at, systemSettings.date_format || 'dd/MM/yyyy')}</div>
                    <div><strong>Payment Method:</strong> ${sale.payment_method || 'N/A'}</div>
                    ${sale.customer_phone ? `<div><strong>Customer Phone:</strong> ${sale.customer_phone}</div>` : ''}
                </div>
            </div>
        </div>
        
        <div class="customer-section">
            <div class="section-title">Bill To:</div>
            <div class="customer-info">
                <div><strong>${sale.customer_name || 'Customer Name'}</strong></div>
                ${sale.customer_address ? `<div>${sale.customer_address}</div>` : ''}
                ${sale.customer_phone ? `<div>Phone: ${sale.customer_phone}</div>` : ''}
                ${sale.customer_email ? `<div>Email: ${sale.customer_email}</div>` : ''}
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th class="item-name">Item Description</th>
                    <th class="item-quantity">Qty</th>
                    <th class="item-rate">Rate</th>
                    <th class="item-total">Total</th>
                </tr>
            </thead>
            <tbody>
                ${sale.sale_items ? sale.sale_items.map(item => `
                    <tr>
                        <td class="item-name">${item.product_name}</td>
                        <td class="item-quantity">${item.quantity}</td>
                        <td class="item-rate">${formatCurrency(item.rate, systemSettings.currency_symbol || '৳')}</td>
                        <td class="item-total">${formatCurrency(item.total, systemSettings.currency_symbol || '৳')}</td>
                    </tr>
                `).join('') : ''}
            </tbody>
        </table>
        
        <div class="totals-section">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span>${formatCurrency(sale.subtotal, systemSettings.currency_symbol || '৳')}</span>
            </div>
            ${sale.discount_amount && sale.discount_amount > 0 ? `
                <div class="total-row">
                    <span class="total-label">Discount:</span>
                    <span>${formatCurrency(sale.discount_amount, systemSettings.currency_symbol || '৳')}</span>
                </div>
            ` : ''}
            <div class="total-row grand-total">
                <span class="total-label">Grand Total:</span>
                <span>${formatCurrency(sale.grand_total, systemSettings.currency_symbol || '৳')}</span>
            </div>
            ${sale.amount_paid && sale.amount_paid > 0 ? `
                <div class="total-row">
                    <span class="total-label">Amount Paid:</span>
                    <span>${formatCurrency(sale.amount_paid, systemSettings.currency_symbol || '৳')}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Amount Due:</span>
                    <span>${formatCurrency(sale.amount_due || 0, systemSettings.currency_symbol || '৳')}</span>
                </div>
            ` : ''}
        </div>
        
        <div class="payment-info">
            <div><strong>Payment Method:</strong> ${sale.payment_method || 'N/A'}</div>
            <div><strong>Currency:</strong> ${systemSettings.currency_symbol || '৳'} (${systemSettings.currency_code || 'BDT'})</div>
            ${businessSettings.business_hours ? `<div><strong>Business Hours:</strong> ${businessSettings.business_hours}</div>` : ''}
        </div>
        
        <div class="footer">
            ${businessSettings.invoice_footer_message || 'Thank you for your business! Please visit us again.'}
        </div>
    </div>
</body>
</html>`;

  return html;
};

// Download invoice as HTML
export const downloadInvoiceHTML = (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  filename?: string
): void => {
  const html = generateInvoiceHTML(sale, businessSettings, systemSettings);
  
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

// Convert HTML to PDF and download using html2canvas and jsPDF
export const downloadInvoicePDF = async (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  filename?: string
): Promise<void> => {
  try {
    console.log('Starting PDF generation with exact template match...');
    
    // Check if libraries are available
    let html2canvas: any;
    let jsPDF: any;
    
    try {
      console.log('Attempting dynamic imports...');
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      html2canvas = html2canvasModule.default;
      jsPDF = jsPDFModule.default;
      console.log('Dynamic imports successful:', { html2canvas: !!html2canvas, jsPDF: !!jsPDF });
    } catch (importError) {
      console.warn('Dynamic import failed, trying global imports:', importError);
      
      if (typeof window !== 'undefined') {
        html2canvas = (window as any).html2canvas;
        jsPDF = (window as any).jsPDF;
        
        if (!html2canvas || !jsPDF) {
          throw new Error('PDF generation libraries not available. Please ensure html2canvas and jsPDF are properly installed.');
        }
        console.log('Global imports successful:', { html2canvas: !!html2canvas, jsPDF: !!jsPDF });
      } else {
        throw new Error('PDF generation libraries not available.');
      }
    }

    // Generate the exact template HTML that matches your PDF
    console.log('Generating exact template HTML...');
    const html = generateInvoiceHTML(sale, businessSettings, systemSettings);
    
    // Create a temporary container for the invoice
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Times New Roman, serif';
    container.style.zIndex = '-9999';
    
    document.body.appendChild(container);
    console.log('Container added to DOM');
    
    try {
      // Wait for content to load and fonts to render
      console.log('Waiting for content to load...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait for fonts
      
      // Convert HTML to canvas with high quality settings
      console.log('Converting HTML to canvas...');
      const canvas = await html2canvas(container, {
        scale: 4, // Very high scale for maximum quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: container.offsetWidth,
        height: container.offsetHeight,
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Ensure the cloned document has proper styling
          const clonedContainer = clonedDoc.querySelector('.invoice-page');
          if (clonedContainer) {
            (clonedContainer as HTMLElement).style.backgroundColor = 'white';
            (clonedContainer as HTMLElement).style.color = 'black';
          }
        }
      });
      
      console.log('Canvas created successfully:', { width: canvas.width, height: canvas.height });
      
      // Create PDF with A4 dimensions
      console.log('Creating PDF...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions to fit A4 properly
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 5; // 2.5mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      console.log('PDF dimensions calculated:', { pdfWidth, pdfHeight, imgWidth, imgHeight });
      
      // Add image to PDF with precise positioning
      const imgData = canvas.toDataURL('image/png', 1.0); // Full quality
      console.log('Canvas converted to data URL, length:', imgData.length);
      
      pdf.addImage(imgData, 'PNG', 2.5, 2.5, imgWidth, Math.min(imgHeight, pdfHeight - 5));
      
      // If content is too tall, add more pages
      if (imgHeight > pdfHeight - 5) {
        console.log('Content is too tall, adding additional pages...');
        let position = pdfHeight - 5;
        let remainingHeight = imgHeight - position;
        
        while (remainingHeight > 0) {
          pdf.addPage();
          const pageHeight = Math.min(remainingHeight, pdfHeight - 5);
          
          // Create a new canvas for the remaining content
          const remainingCanvas = document.createElement('canvas');
          const remainingCtx = remainingCanvas.getContext('2d');
          remainingCanvas.width = canvas.width;
          remainingCanvas.height = (pageHeight * canvas.width) / imgWidth;
          
          if (remainingCtx) {
            remainingCtx.drawImage(
              canvas, 
              0, (position * canvas.width) / imgWidth,
              canvas.width, remainingCanvas.height,
              0, 0,
              remainingCanvas.width, remainingCanvas.height
            );
            
            const remainingImgData = remainingCanvas.toDataURL('image/png', 1.0);
            pdf.addImage(remainingImgData, 'PNG', 2.5, 2.5, imgWidth, pageHeight);
          }
          
          position += pageHeight;
          remainingHeight = imgHeight - position;
        }
      }
      
      // Download the PDF
      const pdfFilename = filename || `invoice-${sale.invoice_number}.pdf`;
      console.log('Saving PDF:', pdfFilename);
      pdf.save(pdfFilename);
      console.log('PDF saved successfully');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Fallback: offer HTML download instead
      if (confirm('PDF generation failed. Would you like to download as HTML instead?')) {
        downloadInvoiceHTML(sale, businessSettings, systemSettings, filename?.replace('.pdf', '.html'));
      } else {
        throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      // Clean up
      if (document.body.contains(container)) {
        document.body.removeChild(container);
        console.log('Container cleaned up');
      }
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    
    // Final fallback: show error and offer HTML
    if (confirm('PDF download failed. Would you like to download as HTML instead?')) {
      downloadInvoiceHTML(sale, businessSettings, systemSettings, filename?.replace('.pdf', '.html'));
    } else {
      throw new Error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Test function to verify PDF libraries are working
export const testPDFLibraries = async (): Promise<{ html2canvas: boolean; jsPDF: boolean; error?: string }> => {
  try {
    // Test html2canvas
    let html2canvasWorking = false;
    try {
      const html2canvasModule = await import('html2canvas');
      html2canvasWorking = !!html2canvasModule.default;
    } catch (error) {
      console.warn('html2canvas import failed:', error);
    }

    // Test jsPDF
    let jsPDFWorking = false;
    try {
      const jsPDFModule = await import('jspdf');
      jsPDFWorking = !!jsPDFModule.default;
    } catch (error) {
      console.warn('jsPDF import failed:', error);
    }

    return {
      html2canvas: html2canvasWorking,
      jsPDF: jsPDFWorking,
      error: html2canvasWorking && jsPDFWorking ? undefined : 'Some libraries failed to load'
    };
  } catch (error) {
    return {
      html2canvas: false,
      jsPDF: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Simple fallback PDF generation using canvas only
export const downloadInvoicePDFSimple = async (
  sale: SaleData,
  businessSettings: BusinessSettings,
  systemSettings: SystemSettings,
  filename?: string
): Promise<void> => {
  try {
    // This is a simpler approach that might work better in some browsers
    const html = generateInvoiceHTML(sale, businessSettings, systemSettings);
    
    // Create a simple canvas-based approach
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(container);
    
    try {
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to use html2canvas if available
      let canvas: HTMLCanvasElement;
      
      try {
        const html2canvasModule = await import('html2canvas');
        canvas = await html2canvasModule.default(container, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
      } catch (error) {
        // If html2canvas fails, create a simple text-based canvas
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 800, 600);
          ctx.fillStyle = 'black';
          ctx.font = '16px Arial';
          ctx.fillText(`Invoice: ${sale.invoice_number}`, 50, 50);
          ctx.fillText(`Customer: ${sale.customer_name}`, 50, 80);
          ctx.fillText(`Total: ${formatCurrency(sale.grand_total, systemSettings.currency_symbol || '৳')}`, 50, 110);
        }
      }
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename || `invoice-${sale.invoice_number}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  } catch (error) {
    console.error('Simple PDF generation failed:', error);
    throw error;
  }
};
