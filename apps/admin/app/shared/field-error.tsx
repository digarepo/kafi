import type { AnyFieldApi } from '@tanstack/react-form';

export function FieldError({ field }: { field: AnyFieldApi }) {
  if (!field.state.meta.errors.length) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs text-destructive">
      {field.state.meta.errors
        .map((error) =>
          typeof error === 'string'
            ? error
            : (error as { message?: string }).message,
        )
        .filter(Boolean)
        .join('. ')}
    </p>
  );
}
