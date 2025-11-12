"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api', routes_1.default);
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
exports.default = app;
