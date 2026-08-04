import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type CardVariant = 'default' | 'elevated' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverEffect?: boolean;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800',
  elevated: 'bg-white border border-gray-100 shadow-lg dark:bg-gray-900 dark:border-gray-800',
  glass:
    'bg-white/70 backdrop-blur-md border border-white/40 shadow-md dark:bg-gray-900/60 dark:border-gray-700/50',
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', hoverEffect = false, className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl transition-shadow',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        hoverEffect && 'hover:-translate-y-0.5 hover:shadow-xl transition-transform',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export type CardSectionProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(function CardHeader(
  { className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export const CardBody = forwardRef<HTMLDivElement, CardSectionProps>(function CardBody(
  { className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cn(className)} {...rest}>
      {children}
    </div>
  );
});

export const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(function CardFooter(
  { className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

/**
 * `<Card variant="elevated"><Card.Header/>...<Card.Body/>...<Card.Footer/>...</Card>`
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export default Card;
