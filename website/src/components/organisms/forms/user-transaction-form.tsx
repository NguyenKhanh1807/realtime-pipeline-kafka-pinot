'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import { CreditCard, DollarSign } from 'lucide-react';

export interface UserTransactionData {
  cardNumber: string;
  amount: string;
}

interface UserTransactionFormProps {
  onSubmit: (data: UserTransactionData) => void;
  isLoading?: boolean;
  className?: string;
}

export function UserTransactionForm({ onSubmit, isLoading = false, className }: UserTransactionFormProps) {
  const [formData, setFormData] = useState<UserTransactionData>({
    cardNumber: '',
    amount: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserTransactionData, string>>>({});

  const handleInputChange = (field: keyof UserTransactionData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Auto-format card number
    if (field === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
      setFormData(prev => ({ ...prev, cardNumber: formatted }));
    }

    // Format amount
    if (field === 'amount') {
      const numValue = value.replace(/[^\d.]/g, '');
      const parts = numValue.split('.');
      if (parts.length > 1) {
        parts[1] = parts[1].slice(0, 2); // Max 2 decimal places
      }
      setFormData(prev => ({ ...prev, amount: parts.join('.') }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UserTransactionData, string>> = {};

    // Card number validation
    const cardNumberClean = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumberClean) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      newErrors.cardNumber = 'Card number must be 13-19 digits';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleReset = () => {
    setFormData({
      cardNumber: '',
      amount: '',
    });
    setErrors({});
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Details Section */}
        <div className="space-y-4">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Credit Card Information
          </Typography>

          <div className="grid grid-cols-1 gap-4">
            {/* Card Number */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Card Number
              </Typography>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  className={cn(
                    'pl-10 h-11 font-mono',
                    errors.cardNumber && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.cardNumber && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.cardNumber}
                </Typography>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Amount ($)
              </Typography>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={cn(
                    'pl-10 h-11 font-mono',
                    errors.amount && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.amount && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.amount}
                </Typography>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            type="submit"
            className="flex-1 h-11"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Checking Fraud...</span>
              </div>
            ) : (
              'Check Fraud & Score'
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="h-11"
          >
            Reset Form
          </Button>
        </div>
      </form>
    </div>
  );
}

