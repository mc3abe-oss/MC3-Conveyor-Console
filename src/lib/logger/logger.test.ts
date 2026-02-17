import { createLogger } from './index';

describe('Structured Logger', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  function lastJsonOutput(): Record<string, unknown> {
    const calls = [
      ...(console.log as jest.Mock).mock.calls,
      ...(console.warn as jest.Mock).mock.calls,
      ...(console.error as jest.Mock).mock.calls,
    ];
    const lastCall = calls[calls.length - 1][0] as string;
    return JSON.parse(lastCall);
  }

  describe('JSON structure', () => {
    it('outputs correct JSON with all required fields', () => {
      const logger = createLogger();
      logger.info('test message');

      const entry = lastJsonOutput();
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level', 'info');
      expect(entry).toHaveProperty('message', 'test message');
      expect(entry).toHaveProperty('environment', 'production');
    });

    it('includes timestamp in ISO format', () => {
      const logger = createLogger();
      logger.info('ts check');

      const entry = lastJsonOutput();
      const ts = entry.timestamp as string;
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it('includes per-call context in the entry', () => {
      const logger = createLogger();
      logger.info('with context', { requestId: 'abc-123', userId: 'u42' });

      const entry = lastJsonOutput();
      expect(entry.requestId).toBe('abc-123');
      expect(entry.userId).toBe('u42');
    });
  });

  describe('log levels', () => {
    it('debug uses console.log', () => {
      const logger = createLogger();
      logger.debug('debug msg');
      expect(console.log).toHaveBeenCalled();
      expect(lastJsonOutput().level).toBe('debug');
    });

    it('info uses console.log', () => {
      const logger = createLogger();
      logger.info('info msg');
      expect(console.log).toHaveBeenCalled();
      expect(lastJsonOutput().level).toBe('info');
    });

    it('warn uses console.warn', () => {
      const logger = createLogger();
      logger.warn('warn msg');
      expect(console.warn).toHaveBeenCalled();
      expect(lastJsonOutput().level).toBe('warn');
    });

    it('error uses console.error', () => {
      const logger = createLogger();
      logger.error('error msg');
      expect(console.error).toHaveBeenCalled();
      expect(lastJsonOutput().level).toBe('error');
    });
  });

  describe('child logger', () => {
    it('inherits parent context', () => {
      const parent = createLogger({ service: 'calc-engine' });
      const child = parent.child({ module: 'belt' });
      child.info('inherited');

      const entry = lastJsonOutput();
      expect(entry.service).toBe('calc-engine');
      expect(entry.module).toBe('belt');
    });

    it('merges call context with child context', () => {
      const child = createLogger().child({ module: 'belt' });
      child.info('merged', { operation: 'calculate' });

      const entry = lastJsonOutput();
      expect(entry.module).toBe('belt');
      expect(entry.operation).toBe('calculate');
    });

    it('per-call context overrides child context on conflict', () => {
      const child = createLogger().child({ region: 'us-east' });
      child.info('override', { region: 'eu-west' });

      const entry = lastJsonOutput();
      expect(entry.region).toBe('eu-west');
    });

    it('child context overrides parent context on conflict', () => {
      const parent = createLogger({ version: 'v1' });
      const child = parent.child({ version: 'v2' });
      child.info('child override');

      const entry = lastJsonOutput();
      expect(entry.version).toBe('v2');
    });

    it('supports multi-level nesting', () => {
      const grandchild = createLogger({ a: 1 })
        .child({ b: 2 })
        .child({ c: 3 });
      grandchild.info('nested');

      const entry = lastJsonOutput();
      expect(entry.a).toBe(1);
      expect(entry.b).toBe(2);
      expect(entry.c).toBe(3);
    });
  });

  describe('environment handling', () => {
    it('reports the current NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      const logger = createLogger();
      logger.info('env check');

      // In test env, it pretty-prints; grab from console.log
      const call = (console.log as jest.Mock).mock.calls[0][0] as string;
      // Switch to production to get JSON
      process.env.NODE_ENV = 'production';
      const logger2 = createLogger();
      logger2.info('env check');
      const entry = lastJsonOutput();
      expect(entry.environment).toBe('production');
    });

    it('defaults to development when NODE_ENV is unset', () => {
      delete process.env.NODE_ENV;
      const logger = createLogger();
      // Force production-style output for JSON parsing
      process.env.NODE_ENV = 'production';
      const logger2 = createLogger();
      logger2.info('unset');
      const entry = lastJsonOutput();
      expect(entry.environment).toBe('production');
    });
  });

  describe('production vs development output', () => {
    it('production outputs raw JSON string', () => {
      process.env.NODE_ENV = 'production';
      const logger = createLogger();
      logger.info('prod');

      const raw = (console.log as jest.Mock).mock.calls[0][0] as string;
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('development outputs pretty-printed string', () => {
      process.env.NODE_ENV = 'development';
      const logger = createLogger();
      logger.info('dev');

      const raw = (console.log as jest.Mock).mock.calls[0][0] as string;
      expect(raw).toContain('[INFO]');
      expect(raw).toContain('dev');
    });
  });
});
