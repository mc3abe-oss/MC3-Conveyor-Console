import { operationSuccess, operationFailure, OperationResult } from './operation-result';
import { ErrorCodes } from './error-codes';

describe('Operation Result Envelope', () => {
  describe('operationSuccess', () => {
    it('returns ok: true with data populated', () => {
      const result = operationSuccess('belt.calculation', { hp: 1.5 }, 42);

      expect(result.ok).toBe(true);
      expect(result.operation).toBe('belt.calculation');
      expect(result.data).toEqual({ hp: 1.5 });
      expect(result.durationMs).toBe(42);
    });

    it('does not include errorCode or errorMessage', () => {
      const result = operationSuccess('test.op', 'value', 10);

      expect(result.errorCode).toBeUndefined();
      expect(result.errorMessage).toBeUndefined();
    });

    it('includes entityIds when provided', () => {
      const result = operationSuccess('config.save', null, 100, {
        configId: 'cfg-123',
        jobId: 'job-456',
      });

      expect(result.entityIds).toEqual({
        configId: 'cfg-123',
        jobId: 'job-456',
      });
    });

    it('omits entityIds when not provided', () => {
      const result = operationSuccess('test.op', 'data', 5);
      expect(result).not.toHaveProperty('entityIds');
    });

    it('preserves complex data types', () => {
      const data = {
        outputs: { tension: 120.5, hp: 0.75 },
        warnings: ['speed high'],
      };
      const result = operationSuccess('belt.calculation', data, 55);

      expect(result.data).toEqual(data);
    });
  });

  describe('operationFailure', () => {
    it('returns ok: false with errorCode and errorMessage', () => {
      const result = operationFailure(
        'drive.selection',
        ErrorCodes.DRIVE_NO_MATCH,
        'No gearmotor found within speed tolerance',
        150,
      );

      expect(result.ok).toBe(false);
      expect(result.operation).toBe('drive.selection');
      expect(result.errorCode).toBe('DRIVE_NO_MATCH');
      expect(result.errorMessage).toBe('No gearmotor found within speed tolerance');
      expect(result.durationMs).toBe(150);
    });

    it('does not include data', () => {
      const result = operationFailure(
        'test.op',
        ErrorCodes.UNKNOWN_ERROR,
        'something broke',
        10,
      );

      expect(result.data).toBeUndefined();
    });

    it('includes entityIds when provided', () => {
      const result = operationFailure(
        'config.save',
        ErrorCodes.CONFIG_REVISION_CONFLICT,
        'Server version is newer',
        200,
        { configId: 'cfg-789' },
      );

      expect(result.entityIds).toEqual({ configId: 'cfg-789' });
    });

    it('omits entityIds when not provided', () => {
      const result = operationFailure(
        'test.op',
        ErrorCodes.UNKNOWN_ERROR,
        'fail',
        5,
      );
      expect(result).not.toHaveProperty('entityIds');
    });

    it('errorCode only accepts valid ErrorCode values', () => {
      // This is a compile-time check. If this compiles, the type constraint works.
      const result = operationFailure(
        'auth.check',
        ErrorCodes.AUTH_UNAUTHORIZED,
        'Not authenticated',
        30,
      );
      expect(result.errorCode).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('type correctness', () => {
    it('success result data type is inferred', () => {
      const result: OperationResult<{ rpm: number }> = operationSuccess(
        'drive.calc',
        { rpm: 1750 },
        20,
      );
      expect(result.data?.rpm).toBe(1750);
    });

    it('failure result is OperationResult<never>', () => {
      const result: OperationResult<never> = operationFailure(
        'test.op',
        ErrorCodes.CALC_MISSING_INPUT,
        'Missing belt width',
        15,
      );
      expect(result.ok).toBe(false);
    });

    it('duration is always a number', () => {
      const success = operationSuccess('a', null, 0);
      const failure = operationFailure('b', ErrorCodes.UNKNOWN_ERROR, 'x', 0);

      expect(typeof success.durationMs).toBe('number');
      expect(typeof failure.durationMs).toBe('number');
    });
  });
});
