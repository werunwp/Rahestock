import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Truck, MapPin, Calendar, MessageSquare, Phone, User, ExternalLink, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ManualCourierStatusSelector } from '@/components/ManualCourierStatusSelector';

interface CourierStatusDetailsProps {
  sale: {
    id: string;
    invoice_number: string;
    customer_name: string;
    consignment_id?: string;
    courier_status?: string;
    tracking_number?: string;
    estimated_delivery?: string;
    current_location?: string;
    courier_notes?: string;
    delivery_date?: string;
    return_reason?: string;
    courier_name?: string;
    courier_phone?: string;
    last_status_check?: string;
  };
  onRefreshStatus: (saleId: string, consignmentId: string) => Promise<boolean>;
  isRefreshing?: boolean;
}

export function CourierStatusDetails({ sale, onRefreshStatus, isRefreshing = false }: CourierStatusDetailsProps) {
  const [isRefreshingIndividual, setIsRefreshingIndividual] = useState(false);
  const [showManualSelector, setShowManualSelector] = useState(false);

  const handleRefresh = async () => {
    if (!sale.consignment_id) return;
    
    setIsRefreshingIndividual(true);
    try {
      await onRefreshStatus(sale.id, sale.consignment_id);
    } finally {
      setIsRefreshingIndividual(false);
    }
  };

  const handleManualStatusUpdate = (newStatus: string) => {
    // The ManualCourierStatusSelector handles the database update
    // We just need to close the selector and potentially refresh the parent
    setShowManualSelector(false);
    // Trigger a page refresh to update the UI
    window.dispatchEvent(new CustomEvent('salesDataUpdated'));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_transit':
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'returned':
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_sent':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return '✅';
      case 'in_transit':
        return '🚚';
      case 'out_for_delivery':
        return '📦';
      case 'returned':
        return '↩️';
      case 'lost':
        return '❌';
      case 'not_sent':
        return '📋';
      default:
        return '⏳';
    }
  };

  if (!sale.consignment_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Courier Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <Truck className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p>Order not yet sent to courier</p>
            <p className="text-sm">Use the truck button to send this order to courier service</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Courier Status
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManualSelector(!showManualSelector)}
              className="h-6 w-6 p-0"
              title="Manual status update"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isRefreshingIndividual}
              className="h-6 w-6 p-0"
              title="Refresh status"
            >
              <RefreshCw className={cn("h-3 w-3", (isRefreshing || isRefreshingIndividual) && "animate-spin")} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon(sale.courier_status)}</span>
          <Badge 
            variant="outline" 
            className={cn("text-sm font-medium", getStatusColor(sale.courier_status))}
          >
            {sale.courier_status === 'not_sent' ? 'Not Sent' : 
             sale.courier_status === 'in_transit' ? 'In Transit' :
             sale.courier_status === 'out_for_delivery' ? 'Out for Delivery' :
             sale.courier_status === 'returned' ? 'Returned' :
             sale.courier_status === 'lost' ? 'Lost' :
             sale.courier_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
          </Badge>
        </div>

        {/* Manual Status Selector */}
        {showManualSelector && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Manual Status Update</span>
              </div>
              <ManualCourierStatusSelector
                saleId={sale.id}
                currentStatus={sale.courier_status}
                onStatusUpdate={handleManualStatusUpdate}
                variant="dropdown"
                size="sm"
              />
            </div>
          </>
        )}

        <Separator />

        {/* Tracking Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tracking ID:</span>
            <a 
              href={`https://merchant.pathao.com/courier/orders/${sale.consignment_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded font-mono transition-colors cursor-pointer flex items-center gap-1"
            >
              {sale.consignment_id}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          {sale.tracking_number && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tracking Number:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">{sale.tracking_number}</code>
            </div>
          )}
        </div>

        {/* Delivery Information */}
        {(sale.estimated_delivery || sale.delivery_date) && (
          <>
            <Separator />
            <div className="space-y-3">
              {sale.estimated_delivery && sale.courier_status !== 'delivered' && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Delivery:</span>
                  <span className="text-sm">{format(new Date(sale.estimated_delivery), "MMM dd, yyyy")}</span>
                </div>
              )}
              
              {sale.delivery_date && sale.courier_status === 'delivered' && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Delivered on:</span>
                  <span className="text-sm text-green-600">{format(new Date(sale.delivery_date), "MMM dd, yyyy")}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Location Information */}
        {sale.current_location && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Location:</span>
              <span className="text-sm">{sale.current_location}</span>
            </div>
          </>
        )}

        {/* Courier Information */}
        {(sale.courier_name || sale.courier_phone) && (
          <>
            <Separator />
            <div className="space-y-2">
              {sale.courier_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Courier:</span>
                  <span className="text-sm">{sale.courier_name}</span>
                </div>
              )}
              
              {sale.courier_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Contact:</span>
                  <span className="text-sm">{sale.courier_phone}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes and Return Reason */}
        {(sale.courier_notes || sale.return_reason) && (
          <>
            <Separator />
            <div className="space-y-2">
              {sale.courier_notes && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">Courier Notes:</span>
                    <p className="text-sm text-muted-foreground mt-1">{sale.courier_notes}</p>
                  </div>
                </div>
              )}
              
              {sale.return_reason && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-red-600">Return Reason:</span>
                    <p className="text-sm text-red-600 mt-1">{sale.return_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Last Update */}
        {sale.last_status_check && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground text-center">
              Last updated: {format(new Date(sale.last_status_check), "MMM dd, yyyy 'at' HH:mm")}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
