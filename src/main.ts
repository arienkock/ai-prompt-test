import express, { NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import { AuthRoutes } from './web-controller/routes/AuthRoutes';
import { UserRoutes } from './web-controller/routes/UserRoutes';
import { ErrorHandler } from './web-controller/middleware/ErrorHandler';
import { AuthMiddleware } from './web-controller/middleware/AuthMiddleware';
import { CreateAppContext } from './web-controller/AppContext';
import pino from 'pino';
import { AppContext, Context } from './domain/types/Context';

const app = express();
const PORT = process.env.PORT || 8000;

const appContext = CreateAppContext();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // 'dev' format for concise color-coded output
app.use(requireRequestContext(appContext))
// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    architecture: 'Layered Architecture with Domain-Driven Design'
  });
});
const authMwSupplier = new AuthMiddleware(appContext)
// Authentication routes
app.use('/api/auth', AuthRoutes.buildRouter(authMwSupplier));

// User management routes
app.use('/api/users', UserRoutes.buildRouter(authMwSupplier));

// Serve static files from frontend build
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA catch-all route - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(frontendDistPath, 'index.html');
  return res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).json({ error: 'Failed to serve application' });
    }
  });
});

// Apply unified error handler as the last middleware
// This will catch any errors thrown by routes or middleware
app.use(ErrorHandler.handle);

// Start server with Prisma initialization
async function startServer() {
  const logger = appContext.logger
  try {
    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📁 Serving frontend from: ${frontendDistPath}`);
      logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
      logger.info(`🔐 Authentication routes: http://localhost:${PORT}/api/auth`);
      logger.info(`⚡ Node.js version: ${process.version}`);
      logger.info(`🏗️ Architecture: Layered with Domain-Driven Design + Prisma ORM`);
    });
  } catch (error) {
    logger.error('Failed to start server: %o', error as Error);
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

function requireRequestContext(appContext: AppContext): any {
  return function(req: any, res: Response, next: NextFunction): void {
    if (!req.context) {
      req.context = appContext.createRequestContext()
    }
    next();
  }
}

