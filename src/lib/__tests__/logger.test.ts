/**
 * Tests for logger utility
 */

import { logger, createLogger, LogLevel, Logger } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set to development mode for human-readable output
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('log levels', () => {
    it('should log debug messages', () => {
      // Create a logger with DEBUG level
      const testLogger = new Logger(LogLevel.DEBUG);
      testLogger.debug('Test debug message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('debug');
      expect(output).toContain('Test debug message');
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('info');
      expect(output).toContain('Test info message');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('warn');
      expect(output).toContain('Test warning message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('error');
      expect(output).toContain('Test error message');
    });
  });

  describe('context', () => {
    it('should include context in logs', () => {
      logger.info('Test message', { userId: 123, action: 'login' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('userId');
      expect(output).toContain('123');
      expect(output).toContain('action');
      expect(output).toContain('login');
    });

    it('should handle empty context', () => {
      logger.info('Test message', {});
      
      expect(consoleLogSpy).toHaveBeenCalled();
      // Should not throw error
    });
  });

  describe('error handling', () => {
    it('should include error details in logs', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:1:1';
      
      logger.error('An error occurred', undefined, error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Test error');
      expect(output).toContain('Error');
    });

    it('should handle errors with context', () => {
      const error = new Error('Test error');
      
      logger.error('An error occurred', { userId: 456 }, error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Test error');
      expect(output).toContain('userId');
      expect(output).toContain('456');
    });
  });

  describe('child logger', () => {
    it('should create child logger with default context', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      
      childLogger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('component');
      expect(output).toContain('TestComponent');
    });

    it('should merge child context with provided context', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      
      childLogger.info('Test message', { action: 'click' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('component');
      expect(output).toContain('TestComponent');
      expect(output).toContain('action');
      expect(output).toContain('click');
    });

    it('should allow overriding default context', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      
      childLogger.info('Test message', { component: 'OverriddenComponent' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('OverriddenComponent');
      expect(output).not.toContain('TestComponent');
    });
  });

  describe('timestamp', () => {
    it('should include ISO timestamp in logs', () => {
      logger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      
      // Should contain an ISO timestamp pattern
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

