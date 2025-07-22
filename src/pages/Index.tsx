import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Rahedeen Productions inventory management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳45,231</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">567</div>
            <p className="text-xs text-muted-foreground">
              +8 new this week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +12 this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Products running low on inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cotton T-Shirt (Large)</p>
                <p className="text-sm text-muted-foreground">SKU: CT-L-001</p>
              </div>
              <Badge variant="destructive">5 left</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Denim Jeans (Medium)</p>
                <p className="text-sm text-muted-foreground">SKU: DJ-M-005</p>
              </div>
              <Badge variant="destructive">3 left</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Polo Shirt (Small)</p>
                <p className="text-sm text-muted-foreground">SKU: PS-S-012</p>
              </div>
              <Badge variant="secondary">8 left</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Payments
            </CardTitle>
            <CardDescription>
              Invoices with outstanding dues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rahman Traders</p>
                <p className="text-sm text-muted-foreground">INV000123 - 5 days overdue</p>
              </div>
              <Badge variant="destructive">৳2,500</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fashion Point</p>
                <p className="text-sm text-muted-foreground">INV000125 - 2 days overdue</p>
              </div>
              <Badge variant="destructive">৳1,800</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Style House</p>
                <p className="text-sm text-muted-foreground">INV000127 - Due today</p>
              </div>
              <Badge variant="secondary">৳3,200</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Use the sidebar to navigate to different sections of your inventory system.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Badge variant="outline">Add Products</Badge>
              <Badge variant="outline">Record Sale</Badge>
              <Badge variant="outline">Update Inventory</Badge>
              <Badge variant="outline">View Reports</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
