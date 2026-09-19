const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const CONFIG = require('./config');
const purwaRoutes = require('./routes/purwaRoutes');

const app = express();

// Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Memungkinkan asset lokal dimuat jika nanti menyajikan frontend
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'purwaverse'
  });
});

// API Routes
app.use('/api', purwaRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Endpoint '${req.originalUrl}' tidak ditemukan.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED SERVER ERROR]', err);
  res.status(500).json({
    ok: false,
    error: 'Terjadi kesalahan internal pada server.'
  });
});

// Start Server if executed directly
if (require.main === module) {
  const PORT = CONFIG.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 [PURWAVERSE SERVER] Berjalan di port ${PORT} (${CONFIG.NODE_ENV})`);
    console.log(`🔗 Health check: http://localhost:${PORT}/`);
    console.log(`⚡ RPC endpoint: http://localhost:${PORT}/api/purwa`);
  });
}

module.exports = app;
