// Express server skeleton for Extractinator
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureConfig } from './config.js';
import { verifyCredentials, issueJWT } from './auth.js';
import settingsRouter from './settings.js';
import extractor from './extractor.js';
import progressRouter from './progress.js';
import { scanInputDir } from './scanInputDir.js';
dotenv.config();

// Ensure config and logs directories exist on startup
await ensureConfig();

const app = express();
app.use(cors());
app.use(express.json());

// Settings endpoints
app.use('/api/settings', settingsRouter);

// Progress streaming (SSE)
app.use('/api/progress', progressRouter);

// List all jobs
app.get('/api/jobs', (req, res) => {
  res.json({ jobs: extractor.getJobs() });
});

// SSE: Stream job updates
const jobClients = new Set();
app.get('/api/jobs/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  // Send initial job list immediately
  const jobs = extractor.getJobs();
  const data = JSON.stringify({ jobs });
  res.write(`data: ${data}\n\n`);
  jobClients.add(res);
  req.on('close', () => jobClients.delete(res));
});

function notifyJobClients() {
  const jobs = extractor.getJobs();
  const data = JSON.stringify({ jobs });
  for (const client of jobClients) client.write(`data: ${data}\n\n`);
}
// Patch extractor to call notifyJobClients on job changes
const origSetStatus = extractor.setStatus?.bind(extractor);
extractor.setStatus = function(jobId, status) {
  if (origSetStatus) origSetStatus(jobId, status);
  notifyJobClients();
};
const origUpdateProgress = extractor.updateProgress?.bind(extractor);
extractor.updateProgress = function(jobId, progress, total) {
  if (origUpdateProgress) origUpdateProgress(jobId, progress, total);
  notifyJobClients();
};

// List available archives in input folder
app.get('/api/archives', async (req, res) => {
  const files = await scanInputDir();
  res.json({ archives: files.map(f => ({ file: f })) });
});

// SSE: Stream archive list updates
const archiveClients = new Set();
app.get('/api/archives/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  archiveClients.add(res);
  req.on('close', () => archiveClients.delete(res));
});

import chokidar from 'chokidar';
const watcher = chokidar.watch(process.env.INPUT_DIR || '/extraction/input', { ignoreInitial: true });
function notifyArchiveClients() {
  scanInputDir().then(files => {
    const data = JSON.stringify({ archives: files.map(f => ({ file: f })) });
    for (const client of archiveClients) client.write(`data: ${data}\n\n`);
  });
}
watcher.on('add', notifyArchiveClients).on('unlink', notifyArchiveClients);


// Trigger processing of queued jobs
app.post('/api/process-queue', async (req, res) => {
  try {
    await extractor.processQueue();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Trigger processing of a single queued job
app.post('/api/jobs/:jobId/process', async (req, res) => {
  const { jobId } = req.params;
  try {
    await extractor.processJob(jobId);
    notifyJobClients();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Manual extract trigger (accepts filename from input folder)
app.post('/api/extract', async (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: 'No file specified' });
  try {
    await extractor.handleNewArchive(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authentication endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (await verifyCredentials(username, password)) {
    const token = issueJWT(username);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Dummy logout endpoint (frontend clears session)
app.post('/api/logout', (req, res) => {
  res.json({ ok: true });
});

// Log download endpoint
import fs from 'fs-extra';
app.get('/api/jobs/:jobId/log', async (req, res) => {
  const job = extractor.getJob(req.params.jobId);
  if (!job || !job.logFile) return res.status(404).send('Not found');
  if (!await fs.pathExists(job.logFile)) return res.status(404).send('Log not found');
  res.download(job.logFile, `${job.id}.log`);
});

// Remove job from queue or job list
app.delete('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = extractor.getJob(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  extractor.jobs.delete(jobId);
  const idx = extractor.queue.findIndex(j => j.id === jobId);
  if (idx !== -1) extractor.queue.splice(idx, 1);
  notifyJobClients();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5573;
app.listen(PORT, () => {
  console.log(`Extractinator backend listening on port ${PORT}`);
  extractor.startWatching();
});
