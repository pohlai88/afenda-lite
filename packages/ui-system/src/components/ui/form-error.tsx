"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const formErrorVariants = cva(
  "flex items-start gap-2 text-sm",
  {
    variants: {
      variant: {
        default: "text-destructive",
        warning: "text-amber-600 dark:text-amber-400",
        info: "text-blue-600 dark:text-blue-400",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface FormErrorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formErrorVariants> {
  message?: string;
  showIcon?: boolean;
}

const FormError = React.forwardRef<HTMLDivElement, FormErrorProps>(
  ({ className, variant, size, message, showIcon = true, children, ...props }, ref) => {
    const content = message || children;
    
    if (!content) return null;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(formErrorVariants({ variant, size }), className)}
        {...props}
      >
        {showIcon && (
          <AlertCircleIcon 
            className="h-4 w-4 shrink-0 mt-0.5" 
            aria-hidden="true" 
          />
        )}
        <span className="flex-1">
          {content}
        </span>
      </div>
    );
  }
);
FormError.displayName = "FormError";

export { FormError, formErrorVariants };