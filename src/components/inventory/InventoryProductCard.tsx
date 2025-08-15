
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Archive } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  attributes: Record<string, string>;
}

interface InventoryProductCardProps {
  product: {
    id: string;
    type: 'product' | 'parent';
    name: string;
    sku: string | null;
    stock_quantity: number | null;
    low_stock_threshold: number | null;
    image_url: string | null;
    variants: ProductVariant[];
  };
  onImageClick: (imageUrl: string) => void;
}

export const InventoryProductCard = ({ product, onImageClick }: InventoryProductCardProps) => {
  const { formatAmount } = useCurrency();

  const getStockStatus = (stock: number, threshold: number | null) => {
    if (stock <= 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (threshold && stock <= threshold) return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  // For simple products (no variants)
  if (product.type === 'product') {
    const stockInfo = getStockStatus(product.stock_quantity || 0, product.low_stock_threshold);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start gap-4">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-16 h-16 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => onImageClick(product.image_url!)}
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 bg-muted flex items-center justify-center rounded">
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              {product.sku && (
                <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium">Stock: {product.stock_quantity}</span>
                <Badge variant={stockInfo.variant}>{stockInfo.status}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // For products with variants
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  
  // Get unique attribute keys from all variants
  const attributeKeys = Array.from(
    new Set(
      product.variants.flatMap(variant => Object.keys(variant.attributes))
    )
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start gap-4">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-16 h-16 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => onImageClick(product.image_url!)}
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 bg-muted flex items-center justify-center rounded">
              <Archive className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <Badge variant="outline" className="text-xs">Variable Product</Badge>
            </div>
            {product.sku && (
              <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium">Total Stock: {totalStock}</span>
              <span className="text-sm text-muted-foreground">{product.variants.length} variants</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {attributeKeys.map(key => (
                <TableHead key={key}>{key}</TableHead>
              ))}
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.variants.map((variant) => {
              const stockInfo = getStockStatus(variant.stock_quantity, variant.low_stock_threshold);
              
              return (
                <TableRow key={variant.id}>
                  {attributeKeys.map(key => (
                    <TableCell key={key}>
                      <Badge variant="outline" className="text-xs">
                        {variant.attributes[key] || '-'}
                      </Badge>
                    </TableCell>
                  ))}
                  <TableCell>
                    <span className="font-medium">{variant.stock_quantity}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
