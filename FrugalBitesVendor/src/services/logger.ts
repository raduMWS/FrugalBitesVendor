/**
 * Logger Service for FrugalBites Vendor App
 * 
 * A configurable logging service that supports:
 * - Multiple log levels (debug, info, warn, error)
 * - Console output (dev mode)
 * - Local storage persistence
 * - Remote logging (production)
 * - Context enrichment (screen, user, device info)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { loggingConfig, LogLevel, LoggingConfig } from '../config/logging.config';

const LOG_STORAGE_KEY = '@FrugalBitesVendor:logs';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

class Logger {
  private config: LoggingConfig;
  private context: string = 'App';
  private pendingLogs: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = loggingConfig;
  }

  /**
   * Create a logger instance with a specific context (e.g., screen name, service name)
   */
  withContext(context: string): Logger {
    const logger = new Logger();
    logger.context = context;
    logger.config = this.config;
    return logger;
  }

  /**
   * Update logger configuration at runtime
   */
  configure(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Check if a log level should be sent remotely
   */
  private shouldLogRemote(level: LogLevel): boolean {
    return this.config.enableRemoteLogging && 
           LOG_LEVELS[level] >= LOG_LEVELS[this.config.remoteMinLevel];
  }

  /**
   * Format log entry
   */
  private formatEntry(level: LogLevel, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (this.config.includeDeviceInfo) {
      entry.deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version.toString(),
      };
    }

    return entry;
  }

  /**
   * Format message for console output
   */
  private formatConsoleMessage(entry: LogEntry): string {
    const parts: string[] = [];
    
    if (this.config.includeTimestamp) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      parts.push(`[${time}]`);
    }
    
    parts.push(`[${entry.level.toUpperCase()}]`);
    parts.push(`[${entry.context}]`);
    parts.push(entry.message);
    
    return parts.join(' ');
  }

  /**
   * Output to console with appropriate styling
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatConsoleMessage(entry);
    const data = entry.data;

    switch (entry.level) {
      case 'debug':
        data !== undefined ? console.debug(message, data) : console.debug(message);
        break;
      case 'info':
        data !== undefined ? console.info(message, data) : console.info(message);
        break;
      case 'warn':
        data !== undefined ? console.warn(message, data) : console.warn(message);
        break;
      case 'error':
        data !== undefined ? console.error(message, data) : console.error(message);
        break;
    }
  }

  /**
   * Store log entry locally
   */
  private async storeLocally(entry: LogEntry): Promise<void> {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      let logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only the most recent logs
      if (logs.length > this.config.maxStoredLogs) {
        logs = logs.slice(-this.config.maxStoredLogs);
      }
      
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      // Silently fail - don't want logging to break the app
      console.error('Failed to store log:', error);
    }
  }

  /**
   * Send log entry to remote server (batched)
   */
  private queueForRemote(entry: LogEntry): void {
    if (!this.shouldLogRemote(entry.level)) return;

    this.pendingLogs.push(entry);
    
    // Batch logs and send every 5 seconds or when we have 10 logs
    if (this.pendingLogs.length >= 10) {
      this.flushRemoteLogs();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushRemoteLogs(), 5000);
    }
  }

  /**
   * Send pending logs to remote server
   */
  private async flushRemoteLogs(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.pendingLogs.length === 0 || !this.config.remoteEndpoint) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: this.config.appName,
          logs: logsToSend,
        }),
      });
    } catch (error) {
      // Put logs back if send failed
      this.pendingLogs = [...logsToSend, ...this.pendingLogs];
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, data);
    
    this.logToConsole(entry);
    this.storeLocally(entry);
    this.queueForRemote(entry);
  }

  // Public logging methods
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Log an error object with stack trace
   */
  logError(error: Error, context?: string): void {
    this.log('error', context || error.message, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }

  /**
   * Get stored logs (useful for debugging or sending reports)
   */
  async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  async clearStoredLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOG_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as string (for sharing/debugging)
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getStoredLogs();
    return logs.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] [${log.context}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating contextual loggers
export { Logger };
