'use client';

import { useState } from 'react';
import { Button, Typography } from '@/src/components/atoms';
import { InputField } from '@/src/components/molecules';
import { cn } from '@/src/lib';
import { CreditCard, DollarSign, Calendar, Lock } from 'lucide-react';

export interface UserTransactionData {
  cardNumber: string;
  expireDate: string; // Format: MM/YY
  cvc: string; // 3-4 digits
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
    expireDate: '',
    cvc: '',
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

    // Format expire date (MM/YY)
    if (field === 'expireDate') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      let formatted = cleaned;
      if (cleaned.length >= 2) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }
      setFormData(prev => ({ ...prev, expireDate: formatted }));
    }

    // Format CVC (3-4 digits only)
    if (field === 'cvc') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({ ...prev, cvc: cleaned }));
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

    // Expire date validation (MM/YY format)
    if (!formData.expireDate) {
      newErrors.expireDate = 'Expiration date is required';
    } else {
      const [month, year] = formData.expireDate.split('/');
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        newErrors.expireDate = 'Invalid format (MM/YY)';
      } else {
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        if (monthNum < 1 || monthNum > 12) {
          newErrors.expireDate = 'Month must be between 01-12';
        }
        const currentYear = new Date().getFullYear() % 100;
        if (yearNum < currentYear) {
          newErrors.expireDate = 'Card has expired';
        }
      }
    }

    // CVC validation
    if (!formData.cvc) {
      newErrors.cvc = 'CVC is required';
    } else if (formData.cvc.length < 3 || formData.cvc.length > 4) {
      newErrors.cvc = 'CVC must be 3-4 digits';
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
      expireDate: '',
      cvc: '',
      amount: '',
    });
    setErrors({});
  };

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Details Section */}
        <div className="space-y-4">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Credit Card Information
          </Typography>

          <div className="grid grid-cols-1 gap-4">
            {/* Card Number */}
            <InputField
              label="Card Number"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              error={errors.cardNumber}
              disabled={isLoading}
              icon={<CreditCard className="h-4 w-4" />}
              inputClassName="h-11 font-mono"
              className="space-y-2"
              required
            />

            {/* Expire Date and CVC */}
            <div className="grid grid-cols-2 gap-4">
              {/* Expire Date */}
              <InputField
                label="Expiration Date"
                type="text"
                placeholder="MM/YY"
                value={formData.expireDate}
                onChange={(e) => handleInputChange('expireDate', e.target.value)}
                error={errors.expireDate}
                disabled={isLoading}
                icon={<Calendar className="h-4 w-4" />}
                inputClassName="h-11 font-mono"
                className="space-y-2"
                maxLength={5}
                required
              />

              {/* CVC */}
              <InputField
                label="CVC"
                type="text"
                placeholder="123"
                value={formData.cvc}
                onChange={(e) => handleInputChange('cvc', e.target.value)}
                error={errors.cvc}
                disabled={isLoading}
                icon={<Lock className="h-4 w-4" />}
                inputClassName="h-11 font-mono"
                className="space-y-2"
                maxLength={4}
                required
              />
            </div>

            {/* Amount */}
            <InputField
              label="Transaction Amount ($)"
              type="text"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={errors.amount}
              disabled={isLoading}
              icon={<DollarSign className="h-4 w-4" />}
              inputClassName="h-11 font-mono"
              className="space-y-2"
              required
            />
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

