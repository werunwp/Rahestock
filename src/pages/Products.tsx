import { Plus, Search, Filter, Edit, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ProductDialog } from "@/components/ProductDialog";
import { useCurrency } from "@/hooks/useCurrency";
import * as XLSX from "xlsx";

const Products = () => {
  const { products, isLoading, deleteProduct, createProduct, updateProduct } = useProducts();
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      Status: product.stock_quantity === 0 ? 'Out of Stock' : 
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
            Total Stock Value: <span className="font-semibold text-foreground">{formatAmount(totalStockValue)}</span>
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-8 w-8 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
          {filteredProducts.map((product) => {
            const getStatus = () => {
              if (product.stock_quantity === 0) return "Out of Stock";
              if (product.stock_quantity <= product.low_stock_threshold) return "Low Stock";
              return "In Stock";
            };
            
            const status = getStatus();
            const stockValue = product.stock_quantity * (product.cost || product.rate);
            
            return (
              <Card key={product.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                <div className="relative">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <span className="text-4xl font-bold text-muted-foreground/50">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant={
                        status === "In Stock" ? "default" : 
                        status === "Low Stock" ? "secondary" : 
                        "destructive"
                      }
                      className="shadow-md"
                    >
                      {status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                      {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                      {(product.size || product.color) && (
                        <div className="flex gap-2 mt-1">
                          {product.size && <span className="text-xs bg-muted px-2 py-1 rounded-full">{product.size}</span>}
                          {product.color && <span className="text-xs bg-muted px-2 py-1 rounded-full">{product.color}</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-primary">{formatAmount(product.rate)}</span>
                        <span className="text-sm font-medium">Stock: {product.stock_quantity}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Stock Value: <span className="font-medium text-foreground">{formatAmount(stockValue)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(product.id)}
                        disabled={deleteProduct.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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