// Extraction workflow & file watcher for Extractinator
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs-extra';
import { getConfig, LOGS_DIR } from './config.js';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';
import tar from 'tar-stream';
import SevenPkg from 'node-7z';
const { extractFull } = SevenPkg;
import { spawn } from 'child_process';

const SUPPORTED_EXTS = ['.zip', '.tar', '.gz', '.tgz', '.bz2', '.tar.gz', '.tar.bz2', '.7z', '.rar'];

class Extractor extends EventEmitter {
  queue = [];
  processingQueue = false;
  constructor() {
    super();
    this.jobs = new Map(); // jobId -> job info
    this.watcher = null;
  }

  async startWatching() {
    const config = await getConfig();
    if (!config.inputDir) return;
    if (this.watcher) this.watcher.close();
    this.watcher = chokidar.watch(config.inputDir, { ignoreInitial: true });
    this.watcher.on('add', file => this.handleNewArchive(file));
  }

  async handleNewArchive(file) {
    if (!SUPPORTED_EXTS.some(ext => file.endsWith(ext))) return;
    const jobId = uuidv4();
    const config = await getConfig();
    const archiveName = path.basename(file);
    let outDir = config.outputDir;
    if (config.subfolders) {
      const base = archiveName.replace(/\.[^.]+$/, '');
      outDir = path.join(outDir, base);
    }
    await fs.ensureDir(outDir);
    const job = {
      id: jobId,
      file,
      outDir,
      status: config.queueMode ? 'queued' : 'pending',
      progress: 0,
      total: 0,
      error: null,
      logFile: path.join(LOGS_DIR, `${new Date().toISOString().slice(0,10)}.log`)
    };
    this.jobs.set(jobId, job);
    this.emit('job', { type: 'created', job });
    if (config.queueMode) {
      this.queue.push(job);
      this.emit('job', { type: 'queued', job });
      return;
    }
    await this._runJob(job, config);
  }

  async _runJob(job, config) {
    job.status = 'pending';
    this.emit('job', { type: 'start', job });
    try {
      await this.extractArchive(job, config);
      job.status = 'done';
      this.emit('job', { type: 'done', job });
      if (config.deleteAfterExtraction) {
        try { await fs.remove(job.file); } catch (e) { console.warn('Failed to delete archive:', job.file, e); }
      }
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      console.error(`[Extractor] Job error: ${archiveName} → ${outDir}: ${err.message}`);
      this.emit('job', { type: 'error', job });
      await fs.appendFile(job.logFile, `[${new Date().toISOString()}] ERROR: ${archiveName}: ${err.stack}\n`);
    }
  }

  async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;
    const config = await getConfig();
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) await this._runJob(job, config);
    }
    this.processingQueue = false;
  }

  async processJob(jobId) {
    // Remove the job from the queue and process it immediately
    const idx = this.queue.findIndex(j => j.id === jobId);
    if (idx === -1) throw new Error('Job not found in queue');
    const [job] = this.queue.splice(idx, 1);
    const config = await getConfig();
    await this._runJob(job, config);
  }

  async extractArchive(job, config) {
    const ext = job.file.toLowerCase();
    if (ext.endsWith('.zip')) {
      const zip = new AdmZip(job.file);
      const entries = zip.getEntries();
      job.total = entries.reduce((acc, e) => acc + e.header.size, 0);
      let extracted = 0;
      for (const entry of entries) {
        const entryPath = path.join(job.outDir, entry.entryName);
        if (entry.isDirectory) {
          await fs.ensureDir(entryPath);
        } else {
          await fs.ensureDir(path.dirname(entryPath));
          zip.extractEntryTo(entry, job.outDir, false, true);
          extracted += entry.header.size;
          job.progress = extracted;
          this.emit('progress', { jobId: job.id, progress: job.progress, total: job.total });
        }
      }
      await fs.appendFile(job.logFile, `[${new Date().toISOString()}] SUCCESS: ${job.file} extracted to ${job.outDir}\n`);
      return;
    }
    if (ext.endsWith('.tar') || ext.endsWith('.tar.gz') || ext.endsWith('.tgz') || ext.endsWith('.tar.bz2') || ext.endsWith('.bz2') || ext.endsWith('.gz')) {
      await this.extractTar(job);
      await fs.appendFile(job.logFile, `[${new Date().toISOString()}] SUCCESS: ${job.file} extracted to ${job.outDir}\n`);
      return;
    }
    if (ext.endsWith('.7z') || ext.endsWith('.rar')) {
      await this.extract7z(job);
      await fs.appendFile(job.logFile, `[${new Date().toISOString()}] SUCCESS: ${job.file} extracted to ${job.outDir}\n`);
      return;
    }
    throw new Error('Unsupported archive format');
  }

  async extractTar(job) {
    // Only supports .tar, .tar.gz, .tgz, .tar.bz2
    // Use tar-stream with fs.createReadStream
    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let total = 0, extracted = 0;
      extract.on('entry', async (header, stream, next) => {
        const filePath = path.join(job.outDir, header.name);
        if (header.type === 'directory') {
          await fs.ensureDir(filePath);
          stream.resume();
          next();
        } else {
          await fs.ensureDir(path.dirname(filePath));
          const ws = fs.createWriteStream(filePath);
          stream.pipe(ws);
          stream.on('data', chunk => {
            extracted += chunk.length;
            job.progress = extracted;
            this.emit('progress', { jobId: job.id, progress: job.progress, total: job.total });
          });
          ws.on('finish', next);
        }
      });
      extract.on('finish', resolve);
      extract.on('error', reject);
      // Count total size
      fs.stat(job.file).then(stat => {
        job.total = stat.size;
        this.emit('progress', { jobId: job.id, progress: 0, total: job.total });
      });
      let stream;
      if (job.file.endsWith('.gz') || job.file.endsWith('.tgz')) {
        const zlib = require('zlib');
        stream = fs.createReadStream(job.file).pipe(zlib.createGunzip()).pipe(extract);
      } else if (job.file.endsWith('.bz2') || job.file.endsWith('.tar.bz2')) {
        const bz2 = require('unbzip2-stream');
        stream = fs.createReadStream(job.file).pipe(bz2()).pipe(extract);
      } else {
        stream = fs.createReadStream(job.file).pipe(extract);
      }
    });
  }

  async extract7z(job) {
    // Use node-7z for both .7z and .rar. Requires 7z binary on PATH.
    return new Promise((resolve, reject) => {
      const seven = extractFull(job.file, job.outDir, {
        $progress: true,
        recursive: true,
        overwrite: 'a',
      });
      let total = 0, extracted = 0;
      seven.on('data', data => {
        if (data.size) {
          extracted += data.size;
          job.progress = extracted;
          this.emit('progress', { jobId: job.id, progress: job.progress, total: job.total });
        }
      });
      seven.on('progress', p => {
        if (p.percent) {
          job.progress = Math.round((p.percent / 100) * (job.total || 1));
          this.emit('progress', { jobId: job.id, progress: job.progress, total: job.total });
        }
      });
      seven.on('end', resolve);
      seven.on('error', err => {
        reject(new Error('7z extraction failed: ' + err.message));
      });
    });
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getJobs() {
    return Array.from(this.jobs.values());
  }
}

const extractor = new Extractor();
export default extractor;
