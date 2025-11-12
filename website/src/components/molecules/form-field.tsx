'use client';

import * as React from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Input } from '@/src/components/atoms/input';
import { cn } from '@/src/lib/utils';

interface FormFieldProps {
  label?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
  description?: string;
}

export function FormField({
  label,
  error,
  required = false,
  className,
  children,
  id,
  description
}: FormFieldProps) {
  const fieldId = id || React.useId();

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label htmlFor={fieldId} className="block">
          <Typography
            variant="span"
            size="sm"
            weight="medium"
            className="text-foreground"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Typography>
        </label>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          'aria-invalid': !!error,
          'aria-describedby': error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined,
        })}
      </div>

      {description && !error && (
        <Typography
          variant="p"
          size="sm"
          color="muted"
          className="text-muted-foreground"
          id={`${fieldId}-description`}
        >
          {description}
        </Typography>
      )}

      {error && (
        <Typography
          variant="p"
          size="sm"
          color="destructive"
          className="text-destructive"
          id={`${fieldId}-error`}
        >
          {error}
        </Typography>
      )}
    </div>
  );
}

interface InputFieldProps extends Omit<FormFieldProps, 'children'> {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
}

export function InputField({
  label,
  error,
  required,
  className,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  icon,
  inputClassName,
  description,
  id
}: InputFieldProps) {

  return (
    <FormField
      label={label}
      error={error}
      required={required}
      className={className}
      description={description}
      id={id}
    >
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            icon && 'pl-10',
            error && 'border-destructive focus:border-destructive',
            inputClassName
          )}
        />
      </div>
    </FormField>
  );
}
