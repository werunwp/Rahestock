import { useState } from "react";
import { Plus, FileText, Download, Search, Filter, Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { downloadInvoicePDF, downloadInvoiceHTML, generateInvoiceHTML, downloadInvoicePDFSimple } from "@/lib/simpleInvoiceGenerator";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const Invoices = () => {
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
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
      
      // Generate HTML invoice and open in new window for printing
      const html = generateInvoiceHTML(saleWithItems, businessSettings, systemSettings);
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
      
      toast.success("Invoice sent to printer");
    } catch (error) {
      toast.error("Failed to print invoice");
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
        await downloadInvoicePDF(saleWithItems, businessSettings, systemSettings);
        toast.dismiss();
        toast.success("Invoice PDF downloaded successfully");
      } catch (error) {
        toast.dismiss();
        console.error("PDF download error:", error);
        
        // Try the simple fallback method
        try {
          toast.loading("Trying alternative method...");
          await downloadInvoicePDFSimple(saleWithItems, businessSettings, systemSettings);
          toast.dismiss();
          toast.success("Invoice downloaded as image successfully");
        } catch (fallbackError) {
          toast.dismiss();
          console.error("Fallback method also failed:", fallbackError);
          toast.error("Failed to download invoice. Please try downloading as HTML instead.");
        }
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
      await downloadInvoiceHTML(saleWithItems, businessSettings, systemSettings);
      toast.success("Invoice HTML downloaded successfully");
    } catch (error) {
      toast.error("Failed to download invoice");
      console.error("Download error:", error);
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
            await downloadInvoicePDF(saleWithItems, businessSettings, systemSettings);
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
            downloadInvoiceHTML(saleWithItems, businessSettings, systemSettings);
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