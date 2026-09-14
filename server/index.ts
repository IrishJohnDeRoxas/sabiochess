import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, AppVariables } from './types';
import auth from './routes/auth';
import energy from './routes/energy';
import settings from './routes/settings';
import promo from './routes/promo';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Global middleware
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Visitor-Id', 'x-visitor-id'],
    credentials: true,
  })
);

// Mount API routes
app.route('/api/auth', auth);
app.route('/api/energy', energy);
app.route('/api/settings', settings);
app.route('/api/promo', promo);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'sabiochess-api',
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 for API routes
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

export default app;
