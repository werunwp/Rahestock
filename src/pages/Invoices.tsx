import { useState } from "react";
import { Plus, FileText, Download, Search, Filter, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSales } from "@/hooks/useSales";
import { SaleDialog } from "@/components/SaleDialog";
import { SaleDetailsDialog } from "@/components/SaleDetailsDialog";
import { formatCurrency } from "@/lib/currency";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const Invoices = () => {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { sales, isLoading } = useSales();

  const filteredSales = sales.filter(sale =>
    sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInvoices = sales.length;
  const paidInvoices = sales.filter(s => s.payment_status === "paid").length;
  const outstandingAmount = sales
    .filter(s => s.payment_status !== "paid")
    .reduce((sum, s) => sum + (s.amount_due || 0), 0);
  const thisMonthRevenue = sales
    .filter(s => new Date(s.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, s) => sum + (s.grand_total || 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track all your invoices and billing
          </p>
        </div>
        <Button onClick={() => setShowSaleDialog(true)} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Total invoices created
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : 0}% payment rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(outstandingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {sales.filter(s => s.payment_status !== "paid").length} pending invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Month to date revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search invoices..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" onClick={handleExportInvoices}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => {
                    const dueDate = addDays(new Date(sale.created_at), 30);
                    const isOverdue = new Date() > dueDate && sale.payment_status !== "paid";
                    
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{format(new Date(sale.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(dueDate, "MMM dd, yyyy")}</TableCell>
                        <TableCell>{formatCurrency(sale.grand_total || 0)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              sale.payment_status === "paid" ? "default" : 
                              isOverdue ? "destructive" :
                              sale.payment_status === "partial" ? "secondary" : 
                              "outline"
                            }
                          >
                            {isOverdue ? "Overdue" : sale.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewInvoice(sale.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePrintInvoice(sale)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadInvoice(sale)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SaleDialog open={showSaleDialog} onOpenChange={setShowSaleDialog} />
      <SaleDetailsDialog 
        open={showDetailsDialog} 
        onOpenChange={handleCloseDetailsDialog}
        saleId={viewingSaleId}
      />
    </div>
  );

  // Handler functions
  function handleViewInvoice(saleId: string) {
    setViewingSaleId(saleId);
    setShowDetailsDialog(true);
  }

  function handleCloseDetailsDialog() {
    setShowDetailsDialog(false);
    setViewingSaleId(null);
  }

  function handlePrintInvoice(sale: any) {
    // Create a printable invoice HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print invoices");
      return;
    }

    const dueDate = addDays(new Date(sale.created_at), 30);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.invoice_number}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .invoice-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px;
          }
          .customer-info {
            margin-bottom: 30px;
          }
          .invoice-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
          }
          .invoice-table th, .invoice-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
          }
          .invoice-table th { 
            background-color: #f5f5f5; 
            font-weight: bold;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .total-row {
            margin: 5px 0;
          }
          .grand-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${sale.invoice_number}</h2>
        </div>
        
        <div class="invoice-info">
          <div>
            <strong>Invoice Date:</strong> ${format(new Date(sale.created_at), "MMM dd, yyyy")}<br>
            <strong>Due Date:</strong> ${format(dueDate, "MMM dd, yyyy")}
          </div>
          <div>
            <strong>Payment Status:</strong> ${sale.payment_status.toUpperCase()}<br>
            <strong>Payment Method:</strong> ${sale.payment_method.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div class="customer-info">
          <h3>Bill To:</h3>
          <strong>${sale.customer_name}</strong><br>
          ${sale.customer_phone ? `Phone: ${sale.customer_phone}<br>` : ''}
          ${sale.customer_whatsapp ? `WhatsApp: ${sale.customer_whatsapp}<br>` : ''}
          ${sale.customer_address ? `Address: ${sale.customer_address}<br>` : ''}
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="4" style="text-align: center; font-style: italic;">Items will be loaded separately</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">Subtotal: ${formatCurrency(sale.subtotal || sale.grand_total)}</div>
          ${sale.discount_amount > 0 ? `<div class="total-row">Discount: -${formatCurrency(sale.discount_amount)}</div>` : ''}
          <div class="total-row grand-total">Total: ${formatCurrency(sale.grand_total || 0)}</div>
          <div class="total-row">Amount Paid: ${formatCurrency(sale.amount_paid || 0)}</div>
          <div class="total-row">Amount Due: ${formatCurrency(sale.amount_due || 0)}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }

  function handleDownloadInvoice(sale: any) {
    // Create invoice data for download
    const dueDate = addDays(new Date(sale.created_at), 30);
    const isOverdue = new Date() > dueDate && sale.payment_status !== "paid";
    
    const invoiceData = [{
      'Invoice Number': sale.invoice_number,
      'Customer Name': sale.customer_name,
      'Customer Phone': sale.customer_phone || '',
      'Customer WhatsApp': sale.customer_whatsapp || '',
      'Customer Address': sale.customer_address || '',
      'Invoice Date': format(new Date(sale.created_at), "MMM dd, yyyy"),
      'Due Date': format(dueDate, "MMM dd, yyyy"),
      'Subtotal': sale.subtotal || sale.grand_total,
      'Discount Percent': sale.discount_percent || 0,
      'Discount Amount': sale.discount_amount || 0,
      'Grand Total': sale.grand_total || 0,
      'Amount Paid': sale.amount_paid || 0,
      'Amount Due': sale.amount_due || 0,
      'Payment Method': sale.payment_method,
      'Payment Status': sale.payment_status,
      'Status': isOverdue ? 'Overdue' : sale.payment_status,
      'Created At': format(new Date(sale.created_at), "MMM dd, yyyy 'at' hh:mm a"),
      'Updated At': format(new Date(sale.updated_at), "MMM dd, yyyy 'at' hh:mm a")
    }];

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(invoiceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");

    // Generate filename
    const filename = `invoice_${sale.invoice_number}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    toast.success("Invoice downloaded successfully");
  }

  function handleExportInvoices() {
    if (filteredSales.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    // Prepare data for export
    const exportData = filteredSales.map(sale => {
      const dueDate = addDays(new Date(sale.created_at), 30);
      const isOverdue = new Date() > dueDate && sale.payment_status !== "paid";
      
      return {
        'Invoice Number': sale.invoice_number,
        'Customer Name': sale.customer_name,
        'Customer Phone': sale.customer_phone || '',
        'Customer WhatsApp': sale.customer_whatsapp || '',
        'Customer Address': sale.customer_address || '',
        'Invoice Date': format(new Date(sale.created_at), "MMM dd, yyyy"),
        'Due Date': format(dueDate, "MMM dd, yyyy"),
        'Subtotal': sale.subtotal || sale.grand_total,
        'Discount Percent': sale.discount_percent || 0,
        'Discount Amount': sale.discount_amount || 0,
        'Grand Total': sale.grand_total || 0,
        'Amount Paid': sale.amount_paid || 0,
        'Amount Due': sale.amount_due || 0,
        'Payment Method': sale.payment_method,
        'Payment Status': sale.payment_status,
        'Status': isOverdue ? 'Overdue' : sale.payment_status,
        'Created At': format(new Date(sale.created_at), "MMM dd, yyyy 'at' hh:mm a"),
        'Updated At': format(new Date(sale.updated_at), "MMM dd, yyyy 'at' hh:mm a")
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    // Generate filename with current date
    const filename = `invoices_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
    
    toast.success("Invoices exported successfully");
  }
};

export default Invoices;