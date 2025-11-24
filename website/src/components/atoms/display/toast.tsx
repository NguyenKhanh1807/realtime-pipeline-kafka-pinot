'use client';

import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { XCircle, CheckCircle, AlertCircle, Info } from "lucide-react"
import React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "!bg-red-500 !text-white !border-red-600 dark:!bg-red-600 dark:!text-white dark:!border-red-700",
          success:
            "!bg-green-500 !text-white !border-green-600 dark:!bg-green-600 dark:!text-white dark:!border-green-700",
        },
      }}
      {...props}
    />
  )
}

// Custom toast functions with icons
const toast = {
  ...sonnerToast,
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
    return sonnerToast.error(message, {
      ...options,
      icon: <XCircle className="h-5 w-5" />,
    })
  },
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
    return sonnerToast.success(message, {
      ...options,
      icon: <CheckCircle className="h-5 w-5" />,
    })
  },
  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
    return sonnerToast.warning(message, {
      ...options,
      icon: <AlertCircle className="h-5 w-5" />,
    })
  },
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    return sonnerToast.info(message, {
      ...options,
      icon: <Info className="h-5 w-5" />,
    })
  },
}

export { Toaster, toast }
