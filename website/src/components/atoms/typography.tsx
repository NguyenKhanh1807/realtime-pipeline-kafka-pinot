import { cn } from "@/src/lib/utils";
import { forwardRef, HTMLAttributes, createElement } from "react";

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "blockquote" | "code" | "label";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl" | "9xl";
  weight?: "thin" | "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold" | "black";
  color?: "default" | "muted" | "accent" | "destructive";
  align?: "left" | "center" | "right" | "justify";
  truncate?: boolean;
  lineClamp?: number;
}

const sizeClasses = {
  xs: "text-xs", // 12px
  sm: "text-sm", // 14px
  base: "text-base", // 16px
  lg: "text-lg", // 18px
  xl: "text-xl", // 20px
  "2xl": "text-2xl", // 24px
  "3xl": "text-3xl", // 30px
  "4xl": "text-4xl", // 36px
  "5xl": "text-5xl", // 48px
  "6xl": "text-6xl", // 60px
  "7xl": "text-7xl", // 72px
  "8xl": "text-8xl", // 96px
  "9xl": "text-9xl", // 128px
};

const weightClasses = {
  thin: "font-thin", // 200
  light: "font-light", // 300
  normal: "font-normal", // 400
  medium: "font-medium", // 500
  semibold: "font-semibold", // 600
  bold: "font-bold", // 700
  extrabold: "font-extrabold", // 800
  black: "font-black", // 900
};

const colorClasses = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "text-accent-foreground",
  destructive: "text-destructive",
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const variantElements = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  p: "p",
  span: "span",
  blockquote: "blockquote",
  code: "code",
  label: "label",
} as const;

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({
    variant = "p",
    size = "base",
    weight = "normal",
    color = "default",
    align,
    truncate = false,
    lineClamp,
    className,
    children,
    ...props
  }, ref) => {
    const elementType = variantElements[variant];

    const classes = cn(
      sizeClasses[size],
      weightClasses[weight],
      colorClasses[color],
      align && alignClasses[align],
      truncate && "truncate",
      lineClamp && `line-clamp-${lineClamp}`,
      className
    );

    return createElement(
      elementType,
      {
        ref: ref as any,
        className: classes,
        ...props
      },
      children
    );
  }
);

Typography.displayName = "Typography";

// Convenience components for common use cases
export const Heading1 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h1" size="4xl" weight="medium" {...props} />
);

export const Heading2 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h2" size="3xl" weight="medium" {...props} />
);

export const Heading3 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h3" size="2xl" weight="medium" {...props} />
);

export const Heading4 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h4" size="xl" weight="medium" {...props} />
);

export const Heading5 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h5" size="lg" weight="medium" {...props} />
);

export const Heading6 = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="h6" size="base" weight="medium" {...props} />
);

export const Paragraph = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="p" {...props} />
);

export const Span = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="span" {...props} />
);

export const Blockquote = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="blockquote" {...props} />
);

export const Code = (props: Omit<TypographyProps, "variant">) => (
  <Typography variant="code" {...props} />
);
