'use client';

import { useState } from 'react';
import { Button, Typography } from '@/src/components/atoms';
import { InputField } from '@/src/components/molecules';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { cn } from '@/src/lib';
import { CreditCard, DollarSign, Calendar, User, Hash, Mail, Shield, RotateCcw } from 'lucide-react';

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

    // Expiry Year validation (separate from month)
    if (!formData.expiryYear) {
      if (!newErrors.expiryMonth) {
        newErrors.expiryYear = 'Expiry year is required';
      }
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
    <div className={cn('w-full max-w-8xl mx-auto mb-2', className)}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Card Details and Transaction Details */}
          <div className="space-y-8">
            {/* Card Details Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <CreditCard className="h-5 w-5 text-primary" />
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  Card Details
                </Typography>
              </div>

              <div className="space-y-5">
                {/* Card Number */}
                <div>
                  <InputField
                    label="Card Number"
                    required
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    error={errors.cardNumber}
                    disabled={isLoading}
                    icon={<CreditCard className="h-4 w-4" />}
                    inputClassName="font-mono h-11"
                    description="Enter your 13-19 digit card number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Expiry Month */}
                  <div>
                    <InputField
                      label="Expiry Month"
                      required
                      type="text"
                      placeholder="MM"
                      value={formData.expiryMonth}
                      onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                      error={errors.expiryMonth}
                      disabled={isLoading}
                      icon={<Calendar className="h-4 w-4" />}
                      inputClassName="font-mono h-11"
                      description="Month (01-12)"
                    />
                  </div>

                  {/* Expiry Year */}
                  <div>
                    <InputField
                      label="Expiry Year"
                      required
                      type="text"
                      placeholder="YY"
                      value={formData.expiryYear}
                      onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                      error={errors.expiryYear}
                      disabled={isLoading}
                      icon={<Calendar className="h-4 w-4" />}
                      inputClassName="font-mono h-11"
                      description="Year (e.g., 25)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* CVV */}
                  <div>
                    <InputField
                      label="CVV"
                      required
                      type="text"
                      placeholder="123"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value)}
                      error={errors.cvv}
                      disabled={isLoading}
                      icon={<Hash className="h-4 w-4" />}
                      inputClassName="font-mono h-11"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <InputField
                      label="Amount"
                      required
                      type="text"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      error={errors.amount}
                      disabled={isLoading}
                      icon={<DollarSign className="h-4 w-4" />}
                      inputClassName="font-mono h-11"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Customer Details and Actions */}
          <div className="space-y-8">
            {/* Customer Details Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="h-5 w-5 text-primary" />
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  Customer Details
                </Typography>
              </div>

              <div className="space-y-5">
                {/* Customer Name */}
                <div>
                  <InputField
                    label="Customer Name"
                    required
                    type="text"
                    placeholder="John Doe"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    error={errors.customerName}
                    disabled={isLoading}
                    icon={<User className="h-4 w-4" />}
                    inputClassName="h-11"
                    description="Full name of the customer"
                  />
                </div>

                {/* Customer Email */}
                <div>
                  <InputField
                    label="Customer Email"
                    required
                    type="email"
                    placeholder="john.doe@email.com"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    error={errors.customerEmail}
                    disabled={isLoading}
                    icon={<Mail className="h-4 w-4" />}
                    inputClassName="h-11"
                    description="Valid email address"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-row gap-4 pt-6 border-t border-border">
              <Button
                type="submit"
                className="flex-1 h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Check for Fraud</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="h-12 w-12 p-0"
                title="Reset Form"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
