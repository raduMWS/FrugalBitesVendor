/**
 * Logging Configuration
 * 
 * Configure logging behavior for the FrugalBites Vendor App
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface LoggingConfig {
  /** Minimum log level to output. Logs below this level will be ignored */
  minLevel: LogLevel;
  
  /** Enable console logging (useful for development) */
  enableConsole: boolean;
  
  /** Enable local storage of logs (persists across app restarts) */
  enableLocalStorage: boolean;
  
  /** Maximum number of logs to keep in local storage */
  maxStoredLogs: number;
  
  /** Enable sending logs to remote server */
  enableRemoteLogging: boolean;
  
  /** Remote logging endpoint URL */
  remoteEndpoint?: string;
  
  /** Minimum level for remote logging (usually higher than local) */
  remoteMinLevel: LogLevel;
  
  /** Include device info in logs */
  includeDeviceInfo: boolean;
  
  /** Include timestamp in log messages */
  includeTimestamp: boolean;
  
  /** App identifier for logs */
  appName: string;
}

// Development configuration
const developmentConfig: LoggingConfig = {
  minLevel: 'debug',
  enableConsole: true,
  enableLocalStorage: true,
  maxStoredLogs: 500,
  enableRemoteLogging: false,
  remoteMinLevel: 'error',
  includeDeviceInfo: true,
  includeTimestamp: true,
  appName: 'FrugalBitesVendor',
};

// Production configuration
const productionConfig: LoggingConfig = {
  minLevel: 'info',
  enableConsole: false,
  enableLocalStorage: true,
  maxStoredLogs: 200,
  enableRemoteLogging: true,
  remoteEndpoint: 'https://your-logging-server.com/api/logs', // Configure your endpoint
  remoteMinLevel: 'warn',
  includeDeviceInfo: true,
  includeTimestamp: true,
  appName: 'FrugalBitesVendor',
};

// Export config based on environment
export const loggingConfig: LoggingConfig = __DEV__ 
  ? developmentConfig 
  : productionConfig;

// Allow runtime config updates
export const updateLoggingConfig = (updates: Partial<LoggingConfig>): LoggingConfig => {
  Object.assign(loggingConfig, updates);
  return loggingConfig;
};
