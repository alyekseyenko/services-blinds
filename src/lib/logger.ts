export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export interface LogRecord {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private ringBuffer: LogRecord[] = [];
  private maxBufferSize = 500;
  private isLoaded = false;

  private getFilePath(): string | null {
    if (typeof window !== 'undefined') return null;
    try {
      const path = require('path');
      return path.join(process.cwd(), 'src/scratch/system_logs.json');
    } catch {
      return null;
    }
  }

  private ensureDir(filePath: string) {
    if (typeof window !== 'undefined') return;
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Non-blocking
    }
  }

  private loadPersistedLogs() {
    if (typeof window !== 'undefined') return;
    if (this.isLoaded) return;
    this.isLoaded = true;
    try {
      const filePath = this.getFilePath();
      if (!filePath) return;
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data)) {
          this.ringBuffer = data.slice(0, this.maxBufferSize);
        }
      }
    } catch {
      // Fallback
    }
  }

  private persistLogs() {
    if (typeof window !== 'undefined') return;
    try {
      const filePath = this.getFilePath();
      if (!filePath) return;
      this.ensureDir(filePath);
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(this.ringBuffer, null, 2));
    } catch {
      // Non-blocking fallback
    }
  }

  private recordLog(level: LogLevel, message: string, context?: LogContext) {
    this.loadPersistedLogs();
    const timestamp = new Date().toISOString();
    const entry: LogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      level: level.toUpperCase() as any,
      message,
      context
    };

    this.ringBuffer.unshift(entry);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.pop();
    }
    this.persistLogs();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    
    if (this.isProduction) {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message,
        ...(context ? { context } : {})
      });
    }

    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message} ${context ? JSON.stringify(context, null, 2) : ''}`;
  }

  debug(message: string, context?: LogContext) {
    this.recordLog('debug', message, context);
    if (!this.isProduction) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    this.recordLog('info', message, context);
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    this.recordLog('warn', message, context);
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, context?: LogContext, error?: Error) {
    const errorDetails = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;

    const fullContext = { ...context, error: errorDetails };
    this.recordLog('error', message, fullContext);
    console.error(this.formatMessage('error', message, fullContext));
  }

  getRecentLogs(limit = 100): LogRecord[] {
    this.loadPersistedLogs();
    return this.ringBuffer.slice(0, limit);
  }

  clearLogs(): void {
    this.ringBuffer = [];
    this.persistLogs();
  }
}

export const logger = new Logger();
