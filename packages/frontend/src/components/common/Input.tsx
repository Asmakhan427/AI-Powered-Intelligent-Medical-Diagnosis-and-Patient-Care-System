import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'textarea';

interface CommonProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  containerClassName?: string;
}

export type InputProps = CommonProps &
  (
    | ({ type: 'textarea' } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
          className?: string;
        })
    | ({ type?: Exclude<InputType, 'textarea'> } & Omit<
        InputHTMLAttributes<HTMLInputElement>,
        'className'
      > & { className?: string })
  );

const FIELD_BASE =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ' +
  'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500';

/**
 * Text field supporting every common HTML input type plus a `textarea` mode.
 * Forwards its ref to the underlying `<input>` or `<textarea>` element.
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  function Input(props, ref) {
    const autoId = useId();
    const {
      label,
      error,
      helperText,
      required,
      leftIcon,
      rightIcon,
      fullWidth = true,
      containerClassName,
      id = autoId,
      className,
      type,
      ...rest
    } = props;

    const describedBy = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;

    const fieldClassName = cn(
      FIELD_BASE,
      error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900/40'
        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200 dark:border-gray-700 dark:focus:ring-primary-900/40',
      leftIcon && type !== 'textarea' && 'pl-9',
      rightIcon && type !== 'textarea' && 'pr-9',
      className
    );

    return (
      <div className={cn(fullWidth && 'w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {leftIcon && type !== 'textarea' && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}

          {type === 'textarea' ? (
            <textarea
              ref={ref as Ref<HTMLTextAreaElement>}
              id={id}
              aria-invalid={!!error}
              aria-required={required}
              aria-describedby={describedBy}
              className={cn(fieldClassName, 'min-h-[6rem] resize-y')}
              {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as Ref<HTMLInputElement>}
              id={id}
              type={type ?? 'text'}
              aria-invalid={!!error}
              aria-required={required}
              aria-describedby={describedBy}
              className={fieldClassName}
              {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            />
          )}

          {rightIcon && type !== 'textarea' && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={`${id}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

export default Input;
