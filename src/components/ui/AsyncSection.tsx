import type { ReactNode } from "react";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { Card } from "./Card";

interface AsyncSectionProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** Custom loading element (defaults to centered spinner) */
  loadingElement?: ReactNode;
  /** Custom error element (defaults to error message with retry button) */
  errorElement?: ReactNode;
  /** Shown when data is null/undefined/empty array after loading */
  emptyElement?: ReactNode;
  /** Render function receiving the non-null data */
  children: (data: T) => ReactNode;
}

export function AsyncSection<T>({
  data,
  loading,
  error,
  onRetry,
  loadingElement,
  errorElement,
  emptyElement,
  children,
}: AsyncSectionProps<T>) {
  if (loading) {
    return (
      <>
        {loadingElement ?? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <>
        {errorElement ?? (
          <Card className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </Card>
        )}
      </>
    );
  }

  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);

  if (isEmpty && emptyElement) {
    return <>{emptyElement}</>;
  }

  if (data === null || data === undefined) {
    return null;
  }

  return <>{children(data)}</>;
}
