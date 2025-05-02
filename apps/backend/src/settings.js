// Settings endpoints for Extractinator
import express from 'express';
import { getConfig, saveConfig } from './config.js';

const router = express.Router();

// Get current settings
router.get('/', async (req, res) => {
  const config = await getConfig();
  res.json({
    inputDir: config.inputDir,
    outputDir: config.outputDir,
    subfolders: config.subfolders,
    deleteAfterExtraction: config.deleteAfterExtraction,
    queueMode: config.queueMode
  });
});

// Update settings
router.post('/', async (req, res) => {
  const { inputDir, outputDir, subfolders, deleteAfterExtraction, queueMode } = req.body;
  const config = await getConfig();
  if (typeof inputDir === 'string') config.inputDir = inputDir;
  if (typeof outputDir === 'string') config.outputDir = outputDir;
  if (typeof subfolders === 'boolean') config.subfolders = subfolders;
  if (typeof deleteAfterExtraction === 'boolean') config.deleteAfterExtraction = deleteAfterExtraction;
  if (typeof queueMode === 'boolean') config.queueMode = queueMode;
  await saveConfig(config);
  res.json({ ok: true });
});

export default router;
