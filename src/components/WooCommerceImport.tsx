import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Download, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useWooCommerceConnections, useImportLogs } from "@/hooks/useWooCommerceConnections";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WooCommerceFormData {
  site_name: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export const WooCommerceImport = () => {
  const [formData, setFormData] = useState<WooCommerceFormData>({
    site_name: "",
    site_url: "",
    consumer_key: "",
    consumer_secret: "",
  });

  const {
    connections,
    isLoading,
    createConnection,
    isCreating,
    deleteConnection,
    isDeleting,
    startImport,
    isImporting,
  } = useWooCommerceConnections();

  const { data: importLogs } = useImportLogs();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.site_name || !formData.site_url || !formData.consumer_key || !formData.consumer_secret) {
      return;
    }

    createConnection(formData);
    setFormData({
      site_name: "",
      site_url: "",
      consumer_key: "",
      consumer_secret: "",
    });
  };

  const handleInputChange = (field: keyof WooCommerceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Products from WooCommerce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange("site_name", e.target.value)}
                  placeholder="My Store"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_url">WooCommerce Site URL</Label>
                <Input
                  id="site_url"
                  value={formData.site_url}
                  onChange={(e) => handleInputChange("site_url", e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumer_key">Consumer Key</Label>
                <Input
                  id="consumer_key"
                  value={formData.consumer_key}
                  onChange={(e) => handleInputChange("consumer_key", e.target.value)}
                  placeholder="ck_..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumer_secret">Consumer Secret</Label>
                <Input
                  id="consumer_secret"
                  type="password"
                  value={formData.consumer_secret}
                  onChange={(e) => handleInputChange("consumer_secret", e.target.value)}
                  placeholder="cs_..."
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Adding..." : "Add WooCommerce Site"}
            </Button>
          </form>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Connected WooCommerce Sites</h3>
            {connections && connections.length > 0 ? (
              <div className="space-y-3">
                {connections.map((connection) => {
                  const latestLog = importLogs?.find(log => log.connection_id === connection.id);
                  return (
                    <Card key={connection.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{connection.site_name}</h4>
                              <Badge variant={connection.is_active ? "default" : "secondary"}>
                                {connection.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{connection.site_url}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{connection.total_products_imported} products imported</span>
                              {connection.last_import_at && (
                                <span>
                                  Last import: {formatDistanceToNow(new Date(connection.last_import_at))} ago
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => startImport(connection.id)}
                              disabled={isImporting || latestLog?.status === 'in_progress'}
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {latestLog?.status === 'in_progress' ? 'Importing...' : 'Import'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isDeleting}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete WooCommerce Connection</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this WooCommerce connection? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteConnection(connection.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        
                        {latestLog && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(latestLog.status)}
                              <span className="text-sm font-medium">Latest Import</span>
                              <Badge className={getStatusColor(latestLog.status)}>
                                {latestLog.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {latestLog.status === 'in_progress' && (
                              <div className="space-y-2">
                                <Progress 
                                  value={latestLog.total_products > 0 ? (latestLog.imported_products / latestLog.total_products) * 100 : 0} 
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {latestLog.imported_products} of {latestLog.total_products} products imported
                                </p>
                              </div>
                            )}
                            
                            {latestLog.status === 'completed' && (
                              <p className="text-xs text-muted-foreground">
                                Successfully imported {latestLog.imported_products} products
                                {latestLog.failed_products > 0 && ` (${latestLog.failed_products} failed)`}
                              </p>
                            )}
                            
                            {latestLog.status === 'failed' && latestLog.error_message && (
                              <p className="text-xs text-red-600">{latestLog.error_message}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No WooCommerce sites connected yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};