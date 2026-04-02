const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 9527;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../client')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Frontend fallback (SPA) ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  OBE平台后端服务已启动`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  API文档:  http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
