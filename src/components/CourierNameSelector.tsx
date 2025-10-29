import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/utils/toast";

interface CourierNameSelectorProps {
  saleId: string;
  currentCourierName?: string;
  onCourierNameUpdate?: (newCourierName: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'dropdown' | 'inline';
}

const COURIER_NAMES = [
  { value: 'Sundorban', label: 'Sundorban', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Janani', label: 'Janani', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'SR', label: 'SR', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'AJR', label: 'AJR', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'Karatoa', label: 'Karatoa', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { value: 'Bangladesh', label: 'Bangladesh', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'Ahmed', label: 'Ahmed', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'Steadfast', label: 'Steadfast', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'SA', label: 'SA', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

export function CourierNameSelector({ 
  saleId, 
  currentCourierName, 
  onCourierNameUpdate,
  disabled = false,
  size = 'default',
  variant = 'dropdown'
}: CourierNameSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCourierName, setSelectedCourierName] = useState(currentCourierName || '');

  const handleCourierNameChange = async (newCourierName: string) => {
    if (newCourierName === currentCourierName || isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Update the sale in the database
      const { error } = await supabase
        .from('sales')
        .update({ 
          courier_name: newCourierName || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (error) {
        throw error;
      }

      setSelectedCourierName(newCourierName);
      onCourierNameUpdate?.(newCourierName);
      
      toast.success(`Courier assigned: ${newCourierName || 'None'}`, {
        description: `Courier name has been updated`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error updating courier name:', error);
      toast.error('Failed to update courier name', {
        description: 'Please try again or contact support',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCourierNameColor = (courierName: string) => {
    return COURIER_NAMES.find(c => c.value === courierName)?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCourierNameLabel = (courierName: string) => {
    return COURIER_NAMES.find(c => c.value === courierName)?.label || courierName || 'Not Assigned';
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={selectedCourierName}
          onValueChange={handleCourierNameChange}
          disabled={disabled || isUpdating}
        >
          <SelectTrigger className={cn(
            "w-auto min-w-[140px]",
            size === 'sm' && "h-8 text-xs",
            size === 'lg' && "h-12 text-base"
          )}>
            <SelectValue placeholder="Select courier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs bg-gray-100 text-gray-800 border-gray-200"
                >
                  Not Assigned
                </Badge>
              </div>
            </SelectItem>
            {COURIER_NAMES.map((courier) => (
              <SelectItem key={courier.value} value={courier.value}>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", courier.color)}
                  >
                    {courier.label}
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
        <span className="text-sm font-medium">Courier:</span>
        <Badge 
          variant="outline" 
          className={cn("text-sm", getCourierNameColor(selectedCourierName))}
        >
          {getCourierNameLabel(selectedCourierName)}
        </Badge>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      
      <Select
        value={selectedCourierName}
        onValueChange={handleCourierNameChange}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger className={cn(
          "w-full",
          size === 'sm' && "h-8 text-xs",
          size === 'lg' && "h-12 text-base"
        )}>
          <SelectValue placeholder="Select courier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs bg-gray-100 text-gray-800 border-gray-200"
              >
                Not Assigned
              </Badge>
            </div>
          </SelectItem>
          {COURIER_NAMES.map((courier) => (
            <SelectItem key={courier.value} value={courier.value}>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", courier.color)}
                >
                  {courier.label}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

