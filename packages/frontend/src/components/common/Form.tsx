import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';
import { AlertTriangleIcon } from './icons';

interface FormContextValue {
  submitting: boolean;
  errors: Record<string, string>;
}

const FormContext = createContext<FormContextValue | null>(null);

/** Access the enclosing `<Form>`'s submitting state / field errors. */
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useFormContext must be used within a <Form>');
  return ctx;
}

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  /** Field name -> error message, rendered as a summary above the fields. */
  errors?: Record<string, string | undefined>;
  showErrorSummary?: boolean;
  errorSummaryTitle?: string;
  children: ReactNode;
}

/**
 * Lightweight form container: wraps submit handling (with a `submitting`
 * flag exposed via context so a submit `<Button loading={submitting}>` can
 * self-disable) and renders an accessible error summary above the fields.
 */
export function Form({
  onSubmit,
  errors,
  showErrorSummary = true,
  errorSummaryTitle = 'Please fix the following before continuing:',
  className,
  children,
  ...rest
}: FormProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(event);
    } finally {
      setSubmitting(false);
    }
  };

  const errorEntries = Object.entries(errors ?? {}).filter(
    (entry): entry is [string, string] => !!entry[1]
  );

  return (
    <FormContext.Provider value={{ submitting, errors: Object.fromEntries(errorEntries) }}>
      <form onSubmit={handleSubmit} noValidate className={cn('space-y-4', className)} {...rest}>
        {showErrorSummary && errorEntries.length > 0 && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div>
              <p className="font-medium">{errorSummaryTitle}</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {children}
      </form>
    </FormContext.Provider>
  );
}

export default Form;
