"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  AlertCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon 
} from "lucide-react";
import { cn } from "../../lib/utils";

const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      status: {
        success: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300",
        pending: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300",
        error: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300",
        warning: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300",
        inactive: "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-400",
        active: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      status: "inactive",
      size: "md",
    },
  }
);

const statusIcons = {
  success: CheckCircleIcon,
  pending: ClockIcon,
  error: XCircleIcon,
  warning: AlertCircleIcon,
  inactive: PauseCircleIcon,
  active: PlayCircleIcon,
} as const;

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
  showIcon?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status = "inactive", size, label, showIcon = true, children, ...props }, ref) => {
    const content = label || children;
    const IconComponent = status ? statusIcons[status] : null;
    
    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ status, size }), className)}
        role="status"
        aria-label={`Status: ${content}`}
        {...props}
      >
        {showIcon && IconComponent && (
          <IconComponent className="h-3 w-3" aria-hidden="true" />
        )}
        {content}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };