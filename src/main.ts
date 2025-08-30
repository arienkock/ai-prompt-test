import express from 'express';
import cors from 'cors';
import path from 'path';
import { Database } from './data-access/config/database';
import { MigrationRunner } from './data-access/migrations/MigrationRunner';
import { AuthRoutes } from './web-controller/routes/AuthRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const database = new Database();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Start server with database initialization
async function startServer() {
  try {
    // Run database migrations
    const migrationRunner = new MigrationRunner(database.getPool());
    await migrationRunner.runPendingMigrations();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Serving frontend from: ${frontendDistPath}`);
      console.log(`🔗 API available at: http://localhost:${PORT}/api`);
      console.log(`🔐 Authentication routes: http://localhost:${PORT}/api/auth`);
      console.log(`⚡ Node.js version: ${process.version}`);
      console.log(`🏗️ Architecture: Layered with Domain-Driven Design`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
