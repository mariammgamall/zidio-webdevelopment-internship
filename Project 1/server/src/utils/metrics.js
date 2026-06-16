import client from 'prom-client';
import logger from './logger.js';

// Create a Registry to register metrics
const register = new client.Registry();

// Enable default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register]
});

export const activeMeetingsGauge = new client.Gauge({
  name: 'active_meetings_count',
  help: 'Current number of active WebRTC meeting sessions',
  registers: [register]
});

// Middleware to record request metrics
export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode.toString();

    // Avoid logging metric scraping or static endpoints
    if (route !== '/metrics' && route !== '/health') {
      httpRequestsTotal.labels(method, route, status).inc();
      httpRequestDurationSeconds.labels(method, route, status).observe(durationInSeconds);
    }
  });

  next();
};

// Route handler to expose metrics
export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error rendering Prometheus metrics', error);
    res.status(500).end(error);
  }
};
