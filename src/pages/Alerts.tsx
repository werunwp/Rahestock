import { Bell, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Alerts = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Notifications</h1>
          <p className="text-muted-foreground">
            Manage system alerts and notification preferences
          </p>
        </div>
        <Button variant="outline">
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
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              3 critical alerts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">8</div>
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
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Overdue payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              System notifications
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
            {[
              {
                type: "critical",
                title: "Product Out of Stock",
                message: "Sneakers White (SNK-003) is completely out of stock",
                time: "2 minutes ago",
                icon: AlertTriangle,
              },
              {
                type: "warning",
                title: "Low Stock Alert",
                message: "Jeans Dark (JNS-002) is below minimum threshold (8 remaining)",
                time: "15 minutes ago",
                icon: AlertTriangle,
              },
              {
                type: "info",
                title: "Payment Received",
                message: "Payment of $1,250.00 received from John Doe",
                time: "1 hour ago",
                icon: CheckCircle,
              },
              {
                type: "warning",
                title: "Overdue Invoice",
                message: "Invoice INV-001245 is now 5 days overdue",
                time: "2 hours ago",
                icon: Info,
              },
              {
                type: "info",
                title: "New Customer",
                message: "New customer registration: Mike Johnson",
                time: "3 hours ago",
                icon: Info,
              },
            ].map((alert, index) => {
              const IconComponent = alert.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <IconComponent 
                    className={`h-5 w-5 mt-0.5 ${
                      alert.type === "critical" ? "text-destructive" :
                      alert.type === "warning" ? "text-yellow-500" :
                      "text-blue-500"
                    }`} 
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{alert.title}</p>
                      <Badge 
                        variant={
                          alert.type === "critical" ? "destructive" :
                          alert.type === "warning" ? "secondary" :
                          "outline"
                        }
                      >
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
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
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for overdue payments and payment received
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Customer Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  New customer registrations and updates
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>System Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  System maintenance and update notifications
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts via email in addition to in-app notifications
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;