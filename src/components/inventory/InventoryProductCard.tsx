
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
  // For simple products (no variants)
  if (product.type === 'product') {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          {product.sku && (
            <p className="text-muted-foreground text-sm mb-4">{product.sku}</p>
          )}
          
          <div className="flex gap-4 mb-4">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-20 h-20 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => onImageClick(product.image_url!)}
                loading="lazy"
              />
            ) : (
              <div className="w-20 h-20 bg-muted flex items-center justify-center rounded">
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-lg font-semibold mb-1">Total Stock: {product.stock_quantity}</p>
              <p className="text-muted-foreground text-sm">1 variant</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stock</span>
              <span className="text-muted-foreground">Stock</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t">
              <span className="text-sm">Simple Product</span>
              <span className="font-medium">{product.stock_quantity}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For products with variants
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  
  // Get the first attribute key (like "Size", "Color", etc.)
  const firstAttributeKey = product.variants.length > 0 ? Object.keys(product.variants[0].attributes)[0] : '';
  
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        {product.sku && (
          <p className="text-muted-foreground text-sm mb-4">{product.sku}</p>
        )}
        
        <div className="flex gap-4 mb-4">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-20 h-20 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => onImageClick(product.image_url!)}
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 bg-muted flex items-center justify-center rounded">
              <Archive className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1">
            <p className="text-lg font-semibold mb-1">Total Stock: {totalStock}</p>
            <p className="text-muted-foreground text-sm">{product.variants.length} variants</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Select {firstAttributeKey}:</span>
            <span className="text-muted-foreground">Stock</span>
          </div>
          
          {product.variants.map((variant) => (
            <div key={variant.id} className="flex justify-between items-center py-2 border-t">
              <span className="text-sm">{Object.values(variant.attributes)[0]}</span>
              <span className="font-medium">{variant.stock_quantity}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
