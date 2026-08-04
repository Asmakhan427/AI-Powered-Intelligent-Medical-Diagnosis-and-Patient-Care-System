import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../components/common/Button';

describe('Button', () => {
  it('renders its children as the accessible button text', () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button', { name: 'Click me' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    await user.click(screen.getByRole('button', { name: 'Click me' }));

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('loading state', () => {
    it('disables the button, marks it aria-busy, and blocks clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button onClick={handleClick} loading>
          Save changes
        </Button>
      );

      const button = screen.getByRole('button', { name: /save changes/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');

      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('is not aria-busy when not loading', () => {
      render(<Button>Save changes</Button>);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    });
  });

  describe('variants', () => {
    it.each([
      ['primary', 'bg-primary-600'],
      ['secondary', 'bg-gray-100'],
      ['danger', 'bg-red-600'],
      ['success', 'bg-green-600'],
      ['outline', 'border-gray-300'],
    ] as const)('applies the expected classes for the %s variant', (variant, expectedClass) => {
      render(<Button variant={variant}>Button</Button>);
      expect(screen.getByRole('button')).toHaveClass(expectedClass);
    });

    it('defaults to the primary variant when none is specified', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary-600');
    });
  });

  describe('sizes', () => {
    it.each([
      ['sm', 'h-8'],
      ['md', 'h-10'],
      ['lg', 'h-12'],
    ] as const)('applies the expected height class for size %s', (size, expectedClass) => {
      render(<Button size={size}>Button</Button>);
      expect(screen.getByRole('button')).toHaveClass(expectedClass);
    });
  });

  it('applies full width when fullWidth is set', () => {
    render(<Button fullWidth>Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders leftIcon and rightIcon content', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon" />}
        rightIcon={<span data-testid="right-icon" />}
      >
        Button
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});
