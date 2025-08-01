import { useState, useMemo, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, X, TrendingUp, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDashboard } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { formatCurrency } from "@/lib/currency";
import { addDays, isAfter, format, differenceInDays, differenceInHours } from "date-fns";
import { toast } from "sonner";

const Alerts = () => {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [alertSettings, setAlertSettings] = useState({
    lowStock: true,
    payments: true,
    customers: false,
    system: true,
    email: false,
  });

  const { dashboardStats } = useDashboard();
  const { products } = useProducts();
  const { sales } = useSales();
  const { customers } = useCustomers();

  // Load alert settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('alertSettings');
    if (savedSettings) {
      try {
        setAlertSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse saved alert settings:', error);
      }
    }
  }, []);

  // Save alert settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('alertSettings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  // Helper function to format time ago
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const targetDate = new Date(date);
    const hoursAgo = differenceInHours(now, targetDate);
    const daysAgo = differenceInDays(now, targetDate);
    
    if (hoursAgo < 1) return "Just now";
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    if (daysAgo === 1) return "1 day ago";
    return `${daysAgo} days ago`;
  };

  // Generate comprehensive alerts
  const allAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();

    // Out of stock alerts (Critical)
    if (alertSettings.lowStock) {
      products
        .filter(p => p.stock_quantity === 0)
        .forEach(product => {
          alerts.push({
            id: `out-of-stock-${product.id}`,
            type: "critical" as const,
            category: "inventory",
            title: "Product Out of Stock",
            message: `${product.name} ${product.sku ? `(${product.sku})` : ''} is completely out of stock`,
            time: product.updated_at,
            icon: AlertTriangle,
            actionable: true,
            productId: product.id,
          });
        });

      // Low stock alerts (Warning)
      products
        .filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0)
        .forEach(product => {
          alerts.push({
            id: `low-stock-${product.id}`,
            type: "warning" as const,
            category: "inventory",
            title: "Low Stock Alert",
            message: `${product.name} is below minimum threshold (${product.stock_quantity} remaining, threshold: ${product.low_stock_threshold})`,
            time: product.updated_at,
            icon: Package,
            actionable: true,
            productId: product.id,
          });
        });
    }

    // Payment alerts
    if (alertSettings.payments) {
      sales
        .filter(sale => {
          const dueDate = addDays(new Date(sale.created_at), 30);
          return isAfter(now, dueDate) && sale.payment_status !== "paid";
        })
        .forEach(sale => {
          const dueDate = addDays(new Date(sale.created_at), 30);
          const daysOverdue = differenceInDays(now, dueDate);
          
          alerts.push({
            id: `overdue-${sale.id}`,
            type: daysOverdue > 15 ? "critical" as const : "warning" as const,
            category: "payment",
            title: "Overdue Invoice",
            message: `Invoice ${sale.invoice_number} is ${daysOverdue} days overdue (${sale.customer_name}) - ${formatCurrency(sale.amount_due || 0)} due`,
            time: sale.created_at,
            icon: Info,
            actionable: true,
            saleId: sale.id,
          });
        });

      // Large pending payments (Info)
      sales
        .filter(sale => sale.payment_status === "pending" && (sale.amount_due || 0) > 10000)
        .slice(0, 3)
        .forEach(sale => {
          alerts.push({
            id: `large-pending-${sale.id}`,
            type: "info" as const,
            category: "payment",
            title: "Large Pending Payment",
            message: `Invoice ${sale.invoice_number} has a large pending amount: ${formatCurrency(sale.amount_due || 0)}`,
            time: sale.created_at,
            icon: TrendingUp,
            actionable: true,
            saleId: sale.id,
          });
        });
    }

    // Customer alerts
    if (alertSettings.customers) {
      // New customers (last 7 days)
      const sevenDaysAgo = addDays(now, -7);
      customers
        .filter(customer => new Date(customer.created_at) > sevenDaysAgo)
        .slice(0, 5)
        .forEach(customer => {
          alerts.push({
            id: `new-customer-${customer.id}`,
            type: "info" as const,
            category: "customer",
            title: "New Customer",
            message: `${customer.name} joined recently`,
            time: customer.created_at,
            icon: Users,
            actionable: false,
            customerId: customer.id,
          });
        });

      // High-value customers with recent activity
      customers
        .filter(customer => (customer.total_spent || 0) > 50000 && customer.last_purchase_date)
        .filter(customer => {
          const lastPurchase = new Date(customer.last_purchase_date!);
          return differenceInDays(now, lastPurchase) <= 3;
        })
        .slice(0, 3)
        .forEach(customer => {
          alerts.push({
            id: `vip-activity-${customer.id}`,
            type: "info" as const,
            category: "customer",
            title: "VIP Customer Activity",
            message: `${customer.name} (spent ${formatCurrency(customer.total_spent || 0)}) made a recent purchase`,
            time: customer.last_purchase_date!,
            icon: TrendingUp,
            actionable: false,
            customerId: customer.id,
          });
        });
    }

    // Sort by priority and time (critical first, then by most recent)
    return alerts
      .filter(alert => !dismissedAlerts.includes(alert.id))
      .sort((a, b) => {
        const priorityOrder = { critical: 3, warning: 2, info: 1 };
        const aPriority = priorityOrder[a.type];
        const bPriority = priorityOrder[b.type];
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });
  }, [products, sales, customers, alertSettings, dismissedAlerts]);

  // Categorize alerts for stats
  const lowStockAlerts = allAlerts.filter(a => a.category === "inventory" && a.type === "warning");
  const outOfStockAlerts = allAlerts.filter(a => a.category === "inventory" && a.type === "critical");
  const paymentAlerts = allAlerts.filter(a => a.category === "payment");
  const customerAlerts = allAlerts.filter(a => a.category === "customer");

  // Handler functions
  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    toast.success("Alert dismissed");
  };

  const handleMarkAllRead = () => {
    const allAlertIds = allAlerts.map(alert => alert.id);
    setDismissedAlerts(prev => [...prev, ...allAlertIds]);
    toast.success("All alerts marked as read");
  };

  const handleToggleSetting = (setting: keyof typeof alertSettings) => {
    setAlertSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    toast.success("Alert preferences updated");
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Notifications</h1>
          <p className="text-muted-foreground">
            Manage system alerts and notification preferences
          </p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={allAlerts.length === 0}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {allAlerts.filter(a => a.type === "critical").length} critical alerts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Alerts</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {paymentAlerts.filter(a => a.type === "critical").length} critical, {paymentAlerts.filter(a => a.type === "warning").length} warning
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Urgent restocking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No active alerts</p>
                <p className="text-sm text-muted-foreground">Everything looks good!</p>
              </div>
            ) : (
              allAlerts.slice(0, 10).map((alert) => {
                const IconComponent = alert.icon;
                return (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <IconComponent 
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        alert.type === "critical" ? "text-destructive" :
                        alert.type === "warning" ? "text-yellow-500" :
                        "text-blue-500"
                      }`} 
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge 
                          variant={
                            alert.type === "critical" ? "destructive" :
                            alert.type === "warning" ? "secondary" :
                            "outline"
                          }
                          className="text-xs"
                        >
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{getTimeAgo(alert.time)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
            
            {allAlerts.length > 10 && (
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing 10 of {allAlerts.length} alerts
                </p>
                <Button variant="ghost" size="sm" className="mt-2">
                  View All Alerts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when products fall below minimum threshold
                </p>
              </div>
              <Switch 
                checked={alertSettings.lowStock}
                onCheckedChange={() => handleToggleSetting('lowStock')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for overdue payments and payment received
                </p>
              </div>
              <Switch 
                checked={alertSettings.payments}
                onCheckedChange={() => handleToggleSetting('payments')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Customer Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  New customer registrations and updates
                </p>
              </div>
              <Switch 
                checked={alertSettings.customers}
                onCheckedChange={() => handleToggleSetting('customers')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  System maintenance and update notifications
                </p>
              </div>
              <Switch 
                checked={alertSettings.system}
                onCheckedChange={() => handleToggleSetting('system')}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts via email in addition to in-app notifications
                </p>
              </div>
              <Switch 
                checked={alertSettings.email}
                onCheckedChange={() => handleToggleSetting('email')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;