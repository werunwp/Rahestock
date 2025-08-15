import { Plus, Search, Filter, Edit, Trash2, Download, Upload, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useProducts } from "@/hooks/useProducts";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ProductDialog } from "@/components/ProductDialog";
import { ProductCard } from "@/components/ProductCard";
import { useCurrency } from "@/hooks/useCurrency";
import * as XLSX from "xlsx";

const Products = () => {
  const { products, isLoading, deleteProduct, createProduct, updateProduct, duplicateProduct } = useProducts();
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 20;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const totalStockValue = useMemo(() => {
    return products.reduce((total, product) => {
      return total + (product.stock_quantity * (product.cost || product.rate));
    }, 0);
  }, [products]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      toast.error("Please upload a valid XLSX or CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let jsonData: any[] = [];

        if (fileExtension === 'csv') {
          // Handle CSV files
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              jsonData.push(row);
            }
          }
        } else {
          // Handle XLSX/XLS files
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        }

        if (jsonData.length === 0) {
          toast.error("No data found in the file");
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        let updatedCount = 0;
        let processedCount = 0;

        const processBatch = async (items: any[], batchIndex: number) => {
          const batchPromises = items.map(async (row: any, rowIndex: number) => {
            try {
              // Skip completely empty rows
              const hasAnyData = Object.values(row).some(value => 
                value !== null && value !== undefined && String(value).trim() !== ''
              );
              
              if (!hasAnyData) {
                console.log(`Skipping empty row ${rowIndex + 1}`);
                return;
              }

              // Map the data to product structure with flexible field matching
              const productData = {
                name: String(row.Name || row.name || row.PRODUCT_NAME || row['Product Name'] || '').trim(),
                sku: row.SKU || row.sku || row['Product Code'] || row.code || undefined,
                rate: parseFloat(String(row.Rate || row.rate || row.RATE || row.price || row.Price || '0').replace(/[^0-9.-]/g, '')) || 0,
                cost: row.Cost || row.cost || row.COST ? parseFloat(String(row.Cost || row.cost || row.COST || '0').replace(/[^0-9.-]/g, '')) || undefined : undefined,
                stock_quantity: parseInt(String(row['Stock Quantity'] || row.stock_quantity || row.stock || row.Stock || row.STOCK || '0').replace(/[^0-9]/g, '')) || 0,
                low_stock_threshold: parseInt(String(row['Low Stock Threshold'] || row.low_stock_threshold || row.threshold || row.Threshold || '10').replace(/[^0-9]/g, '')) || 10,
                size: row.Size || row.size || row.SIZE ? String(row.Size || row.size || row.SIZE).trim() : undefined,
                color: row.Color || row.color || row.COLOR ? String(row.Color || row.color || row.COLOR).trim() : undefined,
                image_url: row['Image URL'] || row.image_url || row.image || row.Image || row.IMAGE_URL ? String(row['Image URL'] || row.image_url || row.image || row.Image || row.IMAGE_URL).trim() : undefined,
              };

              // Clean up empty string values
              if (productData.sku === '') productData.sku = undefined;
              if (productData.size === '') productData.size = undefined;
              if (productData.color === '') productData.color = undefined;
              if (productData.image_url === '') productData.image_url = undefined;

              console.log(`Processing row ${rowIndex + 1}:`, productData);

              // Validate required fields
              if (!productData.name || productData.name === '') {
                console.log(`Row ${rowIndex + 1} failed: Missing product name`);
                errorCount++;
                return;
              }

              if (productData.rate <= 0) {
                console.log(`Row ${rowIndex + 1} failed: Invalid rate (${productData.rate})`);
                errorCount++;
                return;
              }

              // Check for existing products (by name or SKU)
              const existingProduct = products.find(p => 
                p.name.toLowerCase().trim() === productData.name.toLowerCase().trim() ||
                (productData.sku && p.sku && p.sku.toLowerCase().trim() === String(productData.sku).toLowerCase().trim())
              );

              if (existingProduct) {
                // Check if any data has changed
                const hasChanges = 
                  existingProduct.name !== productData.name ||
                  existingProduct.sku !== productData.sku ||
                  existingProduct.rate !== productData.rate ||
                  existingProduct.cost !== productData.cost ||
                  existingProduct.stock_quantity !== productData.stock_quantity ||
                  existingProduct.low_stock_threshold !== productData.low_stock_threshold ||
                  existingProduct.size !== productData.size ||
                  existingProduct.color !== productData.color ||
                  existingProduct.image_url !== productData.image_url;

                if (!hasChanges) {
                  console.log(`Row ${rowIndex + 1} skipped: No changes detected (${productData.name})`);
                  skippedCount++;
                  return;
                }

                // Update the existing product
                return new Promise((resolve, reject) => {
                  updateProduct.mutate({ id: existingProduct.id, data: productData }, {
                    onSuccess: () => {
                      console.log(`Row ${rowIndex + 1} success: Updated product ${productData.name}`);
                      updatedCount++;
                      resolve(true);
                    },
                    onError: (error) => {
                      console.error(`Row ${rowIndex + 1} failed: Product update error:`, error);
                      errorCount++;
                      reject(error);
                    },
                  });
                });
              }

              // Create the product
              return new Promise((resolve, reject) => {
                createProduct.mutate(productData, {
                  onSuccess: () => {
                    console.log(`Row ${rowIndex + 1} success: Created product ${productData.name}`);
                    successCount++;
                    resolve(true);
                  },
                  onError: (error) => {
                    console.error(`Row ${rowIndex + 1} failed: Product creation error:`, error);
                    errorCount++;
                    reject(error);
                  },
                });
              });

            } catch (error) {
              console.error(`Row ${rowIndex + 1} failed: Row processing error:`, error);
              errorCount++;
            }
          });

          await Promise.allSettled(batchPromises);
          processedCount += items.length;
        };

        // Process in batches to avoid overwhelming the server
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < jsonData.length; i += batchSize) {
          batches.push(jsonData.slice(i, i + batchSize));
        }

        // Process all batches
        for (let i = 0; i < batches.length; i++) {
          await processBatch(batches[i], i);
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Show summary toast after processing
        setTimeout(() => {
          let message = '';
          if (successCount > 0) {
            message += `Successfully imported ${successCount} new products. `;
          }
          if (updatedCount > 0) {
            message += `Updated ${updatedCount} existing products. `;
          }
          if (skippedCount > 0) {
            message += `Skipped ${skippedCount} products (no changes). `;
          }
          if (errorCount > 0) {
            message += `${errorCount} products failed due to invalid data.`;
          }

          if (successCount > 0 || updatedCount > 0) {
            toast.success(message || "Import completed successfully");
          } else if (skippedCount > 0 && errorCount === 0) {
            toast.info(message || "All products were already up to date");
          } else {
            toast.error(message || "Import failed. Please check your data format");
          }
        }, 500);

      } catch (error) {
        console.error('File processing error:', error);
        toast.error("Failed to parse file. Please check the format and try again");
      }
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleExport = () => {
    // Prepare data for export
    const exportData = products.map(product => ({
      Name: product.name,
      SKU: product.sku || '',
      Rate: product.rate,
      Cost: product.cost || '',
      'Stock Quantity': product.stock_quantity,
      'Low Stock Threshold': product.low_stock_threshold,
      Size: product.size || '',
      Color: product.color || '',
      'Image URL': product.image_url || '',
      'Stock Value': product.stock_quantity * (product.cost || product.rate),
      Status: product.stock_quantity <= 0 ? 'Stock Out' : 
              product.stock_quantity <= product.low_stock_threshold ? 'Low Stock' : 'In Stock',
      'Created At': new Date(product.created_at).toLocaleDateString(),
      'Updated At': new Date(product.updated_at).toLocaleDateString()
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    // Generate filename with current date
    const filename = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total Stock Value: <span className="font-semibold text-foreground">
              {isLoading ? <span className="inline-block w-16 h-4 bg-muted rounded animate-pulse" /> : formatAmount(totalStockValue)}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={handleImport}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={!products.length}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          [...Array(10)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square w-full bg-muted animate-pulse" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : paginatedProducts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No products found</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          paginatedProducts.map((product) => <ProductCard key={product.id} product={product} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={duplicateProduct.mutate} isDuplicating={duplicateProduct.isPending} isDeleting={deleteProduct.isPending} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalProducts)} of {totalProducts} items
            </p>
          </div>
          <div className="flex-1 flex justify-center sm:justify-end">
            <Pagination className="mx-0">
              <PaginationContent className="flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} hidden sm:flex`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="sm:hidden"
                  >
                    Prev
                  </Button>
                </PaginationItem>
                
                <div className="sm:hidden flex items-center px-3 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="hidden sm:flex items-center gap-1">
                  {(() => {
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start page if we're near the end
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    const pages = [];
                    
                    // Add first page and ellipsis if needed
                    if (startPage > 1) {
                      pages.push(
                        <PaginationItem key={1}>
                          <PaginationLink
                            onClick={() => setCurrentPage(1)}
                            className={currentPage === 1 ? "bg-muted text-primary font-medium" : "cursor-pointer"}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                      );
                      
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis-start" className="flex h-9 w-9 items-center justify-center text-sm">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // Add visible page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i)}
                            className={currentPage === i ? "bg-muted text-primary font-medium" : "cursor-pointer"}
                          >
                            {i}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    // Add ellipsis and last page if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis-end" className="flex h-9 w-9 items-center justify-center text-sm">
                            ...
                          </span>
                        );
                      }
                      
                      pages.push(
                        <PaginationItem key={totalPages}>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            className={currentPage === totalPages ? "bg-muted text-primary font-medium" : "cursor-pointer"}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} hidden sm:flex`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="sm:hidden"
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
      />

      <ProductDialog 
        open={isDialogOpen} 
        onOpenChange={handleCloseDialog}
        product={editingProduct}
      />
    </div>
  );
};

export default Products;