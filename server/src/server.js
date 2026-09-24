const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const CONFIG = require('./config');
const purwaRoutes = require('./routes/purwaRoutes');

const app = express();

// Trust Proxy Configuration
if (CONFIG.TRUST_PROXY) {
  if (CONFIG.TRUST_PROXY === 'true' || CONFIG.TRUST_PROXY === true) {
    app.set('trust proxy', true);
  } else if (!isNaN(Number(CONFIG.TRUST_PROXY)) && Number(CONFIG.TRUST_PROXY) > 0) {
    app.set('trust proxy', Number(CONFIG.TRUST_PROXY));
  } else {
    app.set('trust proxy', CONFIG.TRUST_PROXY);
  }
}

// Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Memungkinkan asset lokal dimuat jika nanti menyajikan frontend
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Middleware (Staging & Production tidak boleh wildcard '*')
let corsOrigin;
if (CONFIG.NODE_ENV === 'production' || CONFIG.NODE_ENV === 'staging') {
  if (CONFIG.ALLOWED_ORIGIN && CONFIG.ALLOWED_ORIGIN.trim() !== '') {
    const allowedList = CONFIG.ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
    corsOrigin = (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedList.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    };
  } else {
    corsOrigin = false;
  }
} else {
  corsOrigin = CONFIG.ALLOWED_ORIGIN || '*';
}

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoints (Mendukung GET /, /healthz, dan /api/healthz)
app.get(['/', '/healthz', '/api/healthz'], (req, res) => {
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
