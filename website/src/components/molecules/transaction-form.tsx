'use client';

import { useState } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { Typography } from '@/src/components/atoms/typography';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { auditLogger } from '@/src/services/audit-logger';
import { cn } from '@/src/lib/utils';
import { CreditCard, DollarSign, Calendar, MapPin, User, Hash, Mail } from 'lucide-react';

export interface TransactionData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  amount: string;
  merchant: string;
  location: string;
  customerName: string;
  customerEmail: string;
}

interface TransactionFormProps {
  onSubmit: (data: TransactionData) => void;
  isLoading?: boolean;
  className?: string;
}

export function TransactionForm({ onSubmit, isLoading = false, className }: TransactionFormProps) {
  const { correlationId } = useCorrelation();
  const [formData, setFormData] = useState<TransactionData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    amount: '',
    merchant: '',
    location: '',
    customerName: '',
    customerEmail: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TransactionData, string>>>({});

  const handleInputChange = (field: keyof TransactionData, value: string) => {
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

    // Format expiry month
    if (field === 'expiryMonth') {
      const numValue = value.replace(/\D/g, '').slice(0, 2);
      setFormData(prev => ({ ...prev, expiryMonth: numValue }));
    }

    // Format expiry year
    if (field === 'expiryYear') {
      const numValue = value.replace(/\D/g, '').slice(0, 2);
      setFormData(prev => ({ ...prev, expiryYear: numValue }));
    }

    // Format CVV
    if (field === 'cvv') {
      const numValue = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({ ...prev, cvv: numValue }));
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
    const newErrors: Partial<Record<keyof TransactionData, string>> = {};

    // Card number validation
    const cardNumberClean = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumberClean) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      newErrors.cardNumber = 'Card number must be 13-19 digits';
    }

    // Expiry validation
    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiryMonth = 'Expiry date is required';
    } else {
      const month = parseInt(formData.expiryMonth);
      const year = parseInt('20' + formData.expiryYear);
      const now = new Date();
      const expiryDate = new Date(year, month - 1);

      if (month < 1 || month > 12) {
        newErrors.expiryMonth = 'Invalid month';
      } else if (expiryDate < now) {
        newErrors.expiryMonth = 'Card has expired';
      }
    }

    // CVV validation
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      newErrors.cvv = 'CVV must be 3-4 digits';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Merchant validation
    if (!formData.merchant.trim()) {
      newErrors.merchant = 'Merchant name is required';
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    // Customer details validation
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
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
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      amount: '',
      merchant: '',
      location: '',
      customerName: '',
      customerEmail: '',
    });
    setErrors({});
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Details Section */}
        <div className="space-y-4">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Card Details
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Number */}
            <div className="md:col-span-2 space-y-2">
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

            {/* Expiry Month */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Expiry Month
              </Typography>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="MM"
                  value={formData.expiryMonth}
                  onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                  className={cn(
                    'pl-10 h-11 font-mono',
                    errors.expiryMonth && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Expiry Year */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Expiry Year
              </Typography>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="YY"
                  value={formData.expiryYear}
                  onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                  className={cn(
                    'pl-10 h-11 font-mono',
                    errors.expiryMonth && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* CVV */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                CVV
              </Typography>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="123"
                  value={formData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  className={cn(
                    'pl-10 h-11 font-mono',
                    errors.cvv && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.cvv && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.cvv}
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

        {/* Transaction Details Section */}
        <div className="space-y-4">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Transaction Details
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Merchant */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Merchant
              </Typography>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Amazon.com"
                  value={formData.merchant}
                  onChange={(e) => handleInputChange('merchant', e.target.value)}
                  className={cn(
                    'pl-10 h-11',
                    errors.merchant && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.merchant && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.merchant}
                </Typography>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Location
              </Typography>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="New York, NY"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={cn(
                    'pl-10 h-11',
                    errors.location && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.location && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.location}
                </Typography>
              )}
            </div>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="space-y-4">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
            Customer Details
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Customer Name
              </Typography>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={cn(
                    'pl-10 h-11',
                    errors.customerName && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.customerName && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.customerName}
                </Typography>
              )}
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                Customer Email
              </Typography>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="john.doe@email.com"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className={cn(
                    'pl-10 h-11',
                    errors.customerEmail && 'border-destructive focus:border-destructive'
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.customerEmail && (
                <Typography variant="p" size="sm" color="destructive" className="text-destructive">
                  {errors.customerEmail}
                </Typography>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            type="submit"
            className="flex-1 h-11 bg-blue-primary hover:bg-blue-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'Check for Fraud'
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
