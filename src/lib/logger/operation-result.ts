/**
 * Operation Result Envelope — standardized return type for significant operations.
 *
 * Provides a consistent shape for success/failure outcomes with timing,
 * error codes, and entity tracking.
 */

import { ErrorCode } from './error-codes';

export interface OperationResult<T = unknown> {
  ok: boolean;
  operation: string;
  durationMs: number;
  data?: T;
  errorCode?: ErrorCode;
  errorMessage?: string;
  entityIds?: Record<string, string>;
}

export function operationSuccess<T>(
  operation: string,
  data: T,
  durationMs: number,
  entityIds?: Record<string, string>,
): OperationResult<T> {
  return {
    ok: true,
    operation,
    durationMs,
    data,
    ...(entityIds && { entityIds }),
  };
}

export function operationFailure(
  operation: string,
  errorCode: ErrorCode,
  errorMessage: string,
  durationMs: number,
  entityIds?: Record<string, string>,
): OperationResult<never> {
  return {
    ok: false,
    operation,
    durationMs,
    errorCode,
    errorMessage,
    ...(entityIds && { entityIds }),
  };
}
