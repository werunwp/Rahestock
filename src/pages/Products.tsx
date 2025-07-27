import { Plus, Search, Filter, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useState, useMemo } from "react";
import { ProductDialog } from "@/components/ProductDialog";
import { formatCurrency } from "@/lib/currency";

const Products = () => {
  const { products, isLoading, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total Stock Value: <span className="font-semibold text-foreground">{formatCurrency(totalStockValue)}</span>
          </p>
        </div>
        <Button className="w-fit" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        <span className="text-xl font-bold text-primary">{formatCurrency(product.rate)}</span>
                        <span className="text-sm font-medium">Stock: {product.stock_quantity}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Stock Value: <span className="font-medium text-foreground">{formatCurrency(stockValue)}</span>
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

      <ProductDialog 
        open={isDialogOpen} 
        onOpenChange={handleCloseDialog}
        product={editingProduct}
      />
    </div>
  );
};

export default Products;