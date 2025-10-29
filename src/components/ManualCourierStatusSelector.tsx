import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/utils/toast";

interface ManualCourierStatusSelectorProps {
  saleId: string;
  currentStatus?: string;
  onStatusUpdate?: (newStatus: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'dropdown' | 'inline';
}

const COURIER_STATUSES = [
  { value: 'not_sent', label: 'Not Sent', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'payout_ready', label: 'Payout Ready', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'returned', label: 'Returned', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export function ManualCourierStatusSelector({ 
  saleId, 
  currentStatus, 
  onStatusUpdate,
  disabled = false,
  size = 'default',
  variant = 'dropdown'
}: ManualCourierStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'not_sent');

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Update the sale in the database
      const { error } = await supabase
        .from('sales')
        .update({ 
          courier_status: newStatus,
          order_status: newStatus, // Keep for backward compatibility
          last_status_check: new Date().toISOString()
        })
        .eq('id', saleId);

      if (error) {
        throw error;
      }

      // Update payment status based on courier status
      let paymentStatus: 'paid' | 'cancelled' | 'pending' | undefined;
      if (['delivered', 'payout_ready'].includes(newStatus)) {
        paymentStatus = 'paid';
      } else if (['returned', 'lost', 'cancelled'].includes(newStatus)) {
        paymentStatus = 'cancelled';
      } else {
        paymentStatus = 'pending';
      }

      // Update payment status to reflect current courier status
      await supabase
        .from('sales')
        .update({ payment_status: paymentStatus })
        .eq('id', saleId);

      // Log the status change
      await supabase
        .from('courier_status_logs')
        .insert({
          sale_id: saleId,
          status: newStatus,
          notes: `Manually updated from ${currentStatus || 'unknown'} to ${newStatus}`,
          updated_by: 'manual',
          updated_at: new Date().toISOString()
        });

      setSelectedStatus(newStatus);
      onStatusUpdate?.(newStatus);
      
      toast.success(`Status updated to ${COURIER_STATUSES.find(s => s.value === newStatus)?.label}`, {
        description: `Order status has been manually updated`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error updating courier status:', error);
      toast.error('Failed to update status', {
        description: 'Please try again or contact support',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    return COURIER_STATUSES.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    return COURIER_STATUSES.find(s => s.value === status)?.label || status.replace('_', ' ').toUpperCase();
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={selectedStatus}
          onValueChange={handleStatusChange}
          disabled={disabled || isUpdating}
        >
          <SelectTrigger className={cn(
            "w-auto min-w-[140px]",
            size === 'sm' && "h-8 text-xs",
            size === 'lg' && "h-12 text-base"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COURIER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", status.color)}
                  >
                    {status.label}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <Badge 
          variant="outline" 
          className={cn("text-sm", getStatusColor(selectedStatus))}
        >
          {getStatusLabel(selectedStatus)}
        </Badge>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      
      <Select
        value={selectedStatus}
        onValueChange={handleStatusChange}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger className={cn(
          "w-full",
          size === 'sm' && "h-8 text-xs",
          size === 'lg' && "h-12 text-base"
        )}>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {COURIER_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", status.color)}
                >
                  {status.label}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
