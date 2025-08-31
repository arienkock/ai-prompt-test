import pino from 'pino';

class LoggingService {
  private static instance: LoggingService;
  private logger: pino.Logger;

  private constructor() {
    this.logger = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    });

    // You can add more specific child loggers if needed
    // e.g., this.logger.child({ module: 'web-controller' });
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public getLogger(): pino.Logger {
    return this.logger;
  }
}

export const logger = LoggingService.getInstance().getLogger();
