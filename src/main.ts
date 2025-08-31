import express from 'express';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import { Database } from './data-access/config/database';
import { MigrationRunner } from './data-access/migrations/MigrationRunner';
import { AuthRoutes } from './web-controller/routes/AuthRoutes';
import { ErrorHandler } from './web-controller/middleware/ErrorHandler';
import { logger } from './web-controller/services/LoggingService';

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize database
const database = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // 'dev' format for concise color-coded output

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

// Authentication routes
const authRoutes = new AuthRoutes(database.getPool());
app.use('/api/auth', authRoutes.getRouter());

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

// Start server with database initialization
async function startServer() {
  try {
    // Run database migrations
    const migrationRunner = new MigrationRunner(database.getPool());
    await migrationRunner.runPendingMigrations();
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📁 Serving frontend from: ${frontendDistPath}`);
      logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
      logger.info(`🔐 Authentication routes: http://localhost:${PORT}/api/auth`);
      logger.info(`⚡ Node.js version: ${process.version}`);
      logger.info(`🏗️ Architecture: Layered with Domain-Driven Design`);
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
