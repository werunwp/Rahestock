import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DismissibleAlertProps {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  time?: string;
  onDismiss?: (id: string) => void;
  className?: string;
  variant?: 'card' | 'inline';
}

const alertIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const alertVariants = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

export const DismissibleAlert: React.FC<DismissibleAlertProps> = ({
  id,
  title,
  message,
  type,
  time,
  onDismiss,
  className,
  variant = 'card',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const IconComponent = alertIcons[type];
  const variantStyles = alertVariants[type];

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(id);
  };

  if (isDismissed) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border',
          variantStyles.bg,
          variantStyles.border,
          className
        )}
      >
        <IconComponent className={cn('h-5 w-5 mt-0.5 flex-shrink-0', variantStyles.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('font-medium text-sm', variantStyles.text)}>{title}</p>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  type === 'error' ? 'destructive' :
                  type === 'warning' ? 'secondary' :
                  'outline'
                }
                className="text-xs"
              >
                {type}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className={cn('text-sm mt-1', variantStyles.text)}>{message}</p>
          {time && (
            <p className={cn('text-xs mt-1 opacity-75', variantStyles.text)}>{time}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-l-4', variantStyles.border, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center gap-2 text-sm', variantStyles.text)}>
            <IconComponent className={cn('h-4 w-4', variantStyles.icon)} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                type === 'error' ? 'destructive' :
                type === 'warning' ? 'secondary' :
                'outline'
              }
              className="text-xs"
            >
              {type}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={cn('text-sm', variantStyles.text)}>{message}</p>
        {time && (
          <p className={cn('text-xs mt-2 opacity-75', variantStyles.text)}>{time}</p>
        )}
      </CardContent>
    </Card>
  );
};
