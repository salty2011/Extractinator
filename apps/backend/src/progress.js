// SSE progress streaming for Extractinator
import express from 'express';
import extractor from './extractor.js';

const router = express.Router();

// SSE endpoint for per-job progress
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const sendProgress = ({ jobId: id, progress, total }) => {
    if (id === jobId) {
      res.write(`data: ${JSON.stringify({ progress, total })}\n\n`);
    }
  };
  extractor.on('progress', sendProgress);
  req.on('close', () => {
    extractor.off('progress', sendProgress);
    res.end();
  });
});

export default router;
