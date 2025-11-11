import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAG API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      upload: 'POST /api/upload',
      chat: 'POST /api/chat',
      stats: 'GET /api/stats',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   RAG API Server                      ║
║   Running on http://localhost:${PORT}   ║
╚═══════════════════════════════════════╝
  `);
  console.log('Endpoints:');
  console.log('  GET  / - API info');
  console.log('  GET  /api/health - Health check');
  console.log('  POST /api/upload - Upload PDF');
  console.log('  POST /api/chat - Ask question');
  console.log('  GET  /api/stats - Collection stats');
});

export default app;
