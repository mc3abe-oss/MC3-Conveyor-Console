'use client';

import { useEffect } from 'react';
import { telemetry } from '../../lib/telemetry/client';
import { setCalcTelemetryHooks, clearCalcTelemetryHooks } from '../../lib/calculator';

/**
 * TelemetryBootstrap
 * Initializes global error handlers and telemetry client
 * Mount this component once at the app root level
 */
export function TelemetryBootstrap() {
  useEffect(() => {
    // Check kill switch
    if (
      process.env.NEXT_PUBLIC_TELEMETRY_DISABLED === '1' ||
      process.env.NEXT_PUBLIC_TELEMETRY_DISABLED === 'true'
    ) {
      return;
    }

    // Initialize telemetry client
    telemetry.init();

    // Wire up calc telemetry hooks
    setCalcTelemetryHooks({
      onCalcStart: (calcKey, context) => {
        telemetry.trackCalcStart(calcKey, {
          product_key: context.productKey,
          model_key: context.modelKey,
        });
      },
      onCalcSuccess: (calcKey, durationMs, context) => {
        telemetry.trackCalcSuccess(calcKey, durationMs, {
          product_key: context.productKey,
          model_key: context.modelKey,
        });
      },
      onCalcError: (calcKey, error, context) => {
        telemetry.trackCalcError(calcKey, error, {
          product_key: context.productKey,
          model_key: context.modelKey,
          stack: context.stack,
        });
      },
    });

    // Install global error handler
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      telemetry.track({
        event_type: 'error.global',
        severity: 'error',
        message: typeof message === 'string' ? message : String(message),
        stack: error?.stack,
        data: {
          source,
          lineno,
          colno,
        },
      });

      // Call original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Install unhandled rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      telemetry.track({
        event_type: 'error.unhandled_rejection',
        severity: 'error',
        message: error?.message || String(error),
        stack: error?.stack,
        data: {
          reason: String(error),
        },
      });
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      window.onerror = originalOnError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearCalcTelemetryHooks();
      telemetry.destroy();
    };
  }, []);

  // This component renders nothing
  return null;
}
