import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config.js';
import { connectDB, dbStatus } from './db.js';
import apiRouter from './routes/index.js';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  next();
});

app.use('/api', apiRouter);

// Central error handler — never leaks stack traces or secrets to the client.
app.use((err, req, res, next) => {
  const explicit = Number(err.status);
  const status = Number.isFinite(explicit) && explicit > 0 ? explicit : err.expose ? 400 : 500;
  const message = err.expose ? err.message : 'Something went wrong while handling your request.';
  const code = err.code || 'server_error';
  if (!err.expose) console.error('[error]', err);
  res.status(status).json({ error: { message, code } });
});

async function start() {
  const dbOk = await connectDB();
  if (!dbOk) {
    console.warn(`[warn] MongoDB unavailable (${dbStatus().message}). The API will return 503 for data routes.`);
  }

  app.listen(config.port, () => {
    console.log(`DealMind API listening on http://localhost:${config.port}`);
    console.log(`  MongoDB : ${dbOk ? 'connected' : 'UNREACHABLE'} (${config.mongoUri})`);
    console.log(`  LLM     : ${config.llm.model} @ ${config.llm.baseUrl}`);
    console.log(`  Memory  : Hindsight @ ${config.hindsight.baseUrl}`);
  });
}

start();

export default app;
