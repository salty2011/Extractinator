// Backend config management for Extractinator
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import bcrypt from 'bcrypt';

const CONFIG_DIR = path.join(os.homedir(), '.extractinator');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Docker/env defaults
const DEFAULT_INPUT = process.env.INPUT_DIR || '/extraction/input';
const DEFAULT_OUTPUT = process.env.OUTPUT_DIR || '/extraction/output';

const DEFAULT_PASSWORD = 'extractinator'; // Change after first login
const DEFAULT_USERNAME = 'admin';

async function ensureConfig() {
  await fs.ensureDir(CONFIG_DIR);
  await fs.ensureDir(LOGS_DIR);
  // Always ensure extraction dirs exist
  await fs.ensureDir(DEFAULT_INPUT);
  await fs.ensureDir(DEFAULT_OUTPUT);
  if (!await fs.pathExists(CONFIG_FILE)) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const config = {
      username: DEFAULT_USERNAME,
      passwordHash: hash,
      inputDir: DEFAULT_INPUT,
      outputDir: DEFAULT_OUTPUT,
      subfolders: true,
      deleteAfterExtraction: false,
      queueMode: false
    };
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    console.log(`Default config created at ${CONFIG_FILE}`);
  }
}

async function getConfig() {
  await ensureConfig();
  const config = await fs.readJson(CONFIG_FILE);
  // Ensure new keys exist for backward compatibility
  if (typeof config.deleteAfterExtraction !== 'boolean') config.deleteAfterExtraction = false;
  if (typeof config.queueMode !== 'boolean') config.queueMode = false;
  // Override with env vars if set
  config.inputDir = process.env.INPUT_DIR || config.inputDir || DEFAULT_INPUT;
  config.outputDir = process.env.OUTPUT_DIR || config.outputDir || DEFAULT_OUTPUT;
  return config;
}

async function saveConfig(newConfig) {
  await fs.writeJson(CONFIG_FILE, newConfig, { spaces: 2 });
}

export { CONFIG_DIR, LOGS_DIR, CONFIG_FILE, ensureConfig, getConfig, saveConfig };
