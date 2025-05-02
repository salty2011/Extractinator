// Utility to scan input directory for supported archives
import fs from 'fs-extra';
import path from 'path';
import { getConfig } from './config.js';

const SUPPORTED_EXTS = ['.zip', '.tar', '.gz', '.tgz', '.bz2', '.tar.gz', '.tar.bz2', '.7z', '.rar'];

export async function scanInputDir() {
  const config = await getConfig();
  if (!config.inputDir) return [];
  try {
    const files = await fs.readdir(config.inputDir);
    return files
      .filter(f => {
        const lower = f.toLowerCase();
        // Only allow supported extensions, but explicitly ignore .rXX and .sfv files
        if (/\.r\d{2}$/i.test(lower) || lower.endsWith('.sfv')) return false;
        return SUPPORTED_EXTS.some(ext => lower.endsWith(ext));
      })
      .map(f => path.join(config.inputDir, f));
  } catch {
    return [];
  }
}
