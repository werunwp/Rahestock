import { useState } from "react";
import { Plus, FileText, Download, Search, Filter, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSales } from "@/hooks/useSales";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { SaleDialog } from "@/components/SaleDialog";
import { SaleDetailsDialog } from "@/components/SaleDetailsDialog";
import { useCurrency } from "@/hooks/useCurrency";
import { format, addDays } from "date-fns";
import { toast } from "@/utils/toast";
import { generateCashMemoHTML } from "@/lib/cashMemoTemplate";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const Invoices = () => {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState<string>("");
  const [printOptions, setPrintOptions] = useState<{ size: 'A5' | 'A4'; orientation: 'portrait' | 'landscape'; }>(
    { size: 'A5', orientation: 'portrait' }
  );
  
  const { sales, isLoading, getSaleWithItems } = useSales();
  const { businessSettings } = useBusinessSettings();
  const { systemSettings } = useSystemSettings();
  const { formatAmount } = useCurrency();

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
            <div className="text-2xl font-bold text-destructive">{formatAmount(outstandingAmount)}</div>
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
            <div className="text-2xl font-bold">{formatAmount(thisMonthRevenue)}</div>
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
            Export All
          </Button>
          <Button variant="outline" onClick={handleTestPDFLibraries} title="Test PDF Libraries">
            <FileText className="mr-2 h-4 w-4" />
            Test PDF
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
                        <TableCell>{formatAmount(sale.grand_total || 0)}</TableCell>
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
                               title="Print Invoice (HTML)"
                             >
                               <Printer className="h-4 w-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => handleDownloadInvoicePDF(sale)}
                               title="Download Invoice (PDF)"
                             >
                               <Download className="h-4 w-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => handleDownloadInvoiceHTML(sale)}
                               title="Download Invoice (HTML)"
                             >
                               <FileText className="h-4 w-4" />
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

      {/* Print Preview Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh]">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>Review the invoice and adjust print settings.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Preview */}
            <div className="lg:col-span-3 border rounded overflow-auto h-[60vh] lg:h-full bg-white">
              {/* Use iframe with srcdoc to sandbox styles */}
              <iframe
                title="Invoice Preview"
                className="w-full h-full"
                srcDoc={applyPrintOptionsToHtml(printHtml)}
              />
            </div>
            {/* Settings */}
            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select
                  value={printOptions.size}
                  onValueChange={(v) => setPrintOptions((p) => ({ ...p, size: v as 'A5' | 'A4' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={printOptions.orientation}
                  onValueChange={(v) => setPrintOptions((p) => ({ ...p, orientation: v as 'portrait' | 'landscape' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                Tip: Use browser print dialog to choose printer, margins, and scale.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmPrint}>Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  async function handlePrintInvoice(sale: any) {
    try {
      if (!businessSettings || !systemSettings) {
        toast.error("Settings not loaded");
        return;
      }

      // Get sale with items for complete data
      const saleWithItems = await getSaleWithItems(sale.id);
      
      // Prepare HTML for preview dialog
      const html = generateCashMemoHTML(saleWithItems, businessSettings, systemSettings);
      setPrintHtml(html);
      setIsPrintDialogOpen(true);
    } catch (error) {
      toast.error("Failed to open print preview");
      console.error("Print error:", error);
    }
  }

  async function handleDownloadInvoicePDF(sale: any) {
    try {
      if (!businessSettings || !systemSettings) {
        toast.error("Settings not loaded");
        return;
      }

      // Get sale with items for complete data
      const saleWithItems = await getSaleWithItems(sale.id);
      
      // Show loading toast
      toast.loading("Generating PDF invoice...");
      
      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import('html2canvas'),
          import('jspdf')
        ]);

        const html = generateCashMemoHTML(saleWithItems, businessSettings, systemSettings);
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '148mm';
        container.style.backgroundColor = '#ffffff';
        document.body.appendChild(container);

        try {
          await new Promise(r => setTimeout(r, 400));
          const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', 0, Math.max(0, (pdfHeight - imgHeight) / 2), imgWidth, imgHeight);
          pdf.save(`invoice-${saleWithItems.invoice_number}.pdf`);
          toast.dismiss();
          toast.success("Invoice PDF downloaded successfully");
        } finally {
          if (document.body.contains(container)) document.body.removeChild(container);
        }
      } catch (error) {
        toast.dismiss();
        console.error("PDF download error:", error);
        toast.error("Failed to download invoice. Please try downloading as HTML instead.");
      }
    } catch (error) {
      toast.error("Failed to download invoice");
      console.error("Download error:", error);
    }
  }

  async function handleDownloadInvoiceHTML(sale: any) {
    try {
      if (!businessSettings || !systemSettings) {
        toast.error("Settings not loaded");
        return;
      }

      // Get sale with items for complete data
      const saleWithItems = await getSaleWithItems(sale.id);
      const html = generateCashMemoHTML(saleWithItems, businessSettings, systemSettings);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${saleWithItems.invoice_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Invoice HTML downloaded successfully");
    } catch (error) {
      toast.error("Failed to download invoice");
      console.error("Download error:", error);
    }
  }

  function applyPrintOptionsToHtml(html: string) {
    try {
      // Adjust @page size/orientation by replacing size directive
      const sizeToken = printOptions.size + (printOptions.orientation === 'landscape' ? ' landscape' : '');
      const updated = html.replace(/@page\s*\{[^}]*size:[^;]*;?/m, (match) => {
        // Replace size property inside existing @page block
        if (/size:/.test(match)) {
          return match.replace(/size:[^;]*;/, `size: ${sizeToken};`);
        }
        return match.replace(/\{/, `{ size: ${sizeToken};`);
      });
      return updated;
    } catch {
      return html;
    }
  }

  function handleConfirmPrint() {
    try {
      const finalHtml = applyPrintOptionsToHtml(printHtml);
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(finalHtml);
      w.document.close();
      w.onload = () => {
        w.focus();
        w.print();
      };
    } catch (e) {
      console.error(e);
      toast.error('Failed to start printing');
    }
  }

  async function handleExportInvoices() {
    try {
      if (filteredSales.length === 0) {
        toast.error("No invoices to export");
        return;
      }

      if (!businessSettings || !systemSettings) {
        toast.error("Settings not loaded");
        return;
      }

      // Ask user for export format
      const format = window.confirm("Export as PDF? Click OK for PDF, Cancel for HTML");
      
      if (format) {
        // Export each invoice as a separate PDF
        for (const sale of filteredSales) {
          try {
            const saleWithItems = await getSaleWithItems(sale.id);
            // Use the same template for batch export via PDF
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
              import('html2canvas'),
              import('jspdf')
            ]);
            const html = generateCashMemoHTML(saleWithItems, businessSettings, systemSettings);
            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.position = 'fixed';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = '148mm';
            container.style.backgroundColor = '#ffffff';
            document.body.appendChild(container);
            try {
              await new Promise(r => setTimeout(r, 200));
              const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
              const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = pdfWidth;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              const imgData = canvas.toDataURL('image/png', 1.0);
              pdf.addImage(imgData, 'PNG', 0, Math.max(0, (pdfHeight - imgHeight) / 2), imgWidth, imgHeight);
              pdf.save(`invoice-${saleWithItems.invoice_number}.pdf`);
            } finally {
              if (document.body.contains(container)) document.body.removeChild(container);
            }
          } catch (error) {
            console.error(`Error exporting invoice ${sale.invoice_number}:`, error);
          }
        }
        toast.success(`${filteredSales.length} invoices exported as PDF successfully`);
      } else {
        // Export each invoice as a separate HTML
        for (const sale of filteredSales) {
          try {
            const saleWithItems = await getSaleWithItems(sale.id);
            const html = generateCashMemoHTML(saleWithItems, businessSettings, systemSettings);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-${saleWithItems.invoice_number}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error(`Error exporting invoice ${sale.invoice_number}:`, error);
          }
        }
        toast.success(`${filteredSales.length} invoices exported as HTML successfully`);
      }
    } catch (error) {
      toast.error("Failed to export invoices");
      console.error("Export error:", error);
    }
  }

  // Debug function to test PDF libraries
  async function handleTestPDFLibraries() {
    try {
      const { testPDFLibraries } = await import('@/lib/simpleInvoiceGenerator');
      const result = await testPDFLibraries();
      
      if (result.html2canvas && result.jsPDF) {
        toast.success("PDF libraries are working correctly!");
      } else {
        toast.error(`PDF libraries test failed: ${result.error}`);
        console.log("PDF Libraries Test Result:", result);
      }
    } catch (error) {
      toast.error("Failed to test PDF libraries");
      console.error("Test error:", error);
    }
  }
};

export default Invoices;