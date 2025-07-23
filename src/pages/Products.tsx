import { Plus, Package, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const Products = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
        </div>
        <Button className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Sample Product Cards */}
        {[
          { name: "T-Shirt Blue", sku: "TSH-001", stock: 45, price: 25.99, status: "In Stock" },
          { name: "Jeans Dark", sku: "JNS-002", stock: 8, price: 79.99, status: "Low Stock" },
          { name: "Sneakers White", sku: "SNK-003", stock: 0, price: 129.99, status: "Out of Stock" },
          { name: "Hoodie Gray", sku: "HOD-004", stock: 23, price: 59.99, status: "In Stock" },
        ].map((product, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Package className="h-8 w-8 text-muted-foreground" />
                <Badge 
                  variant={
                    product.status === "In Stock" ? "default" : 
                    product.status === "Low Stock" ? "secondary" : 
                    "destructive"
                  }
                >
                  {product.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">${product.price}</span>
                  <span className="text-sm">Stock: {product.stock}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Products;