import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = (typeof globalThis !== 'undefined' && (globalThis as any).VITE_API_URL) || '/api';

export default function SettingsPanel({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [inputDir, setInputDir] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [subfolders, setSubfolders] = useState(true);
  const [deleteAfterExtraction, setDeleteAfterExtraction] = useState(false);
  const [queueMode, setQueueMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/settings`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch settings');
        return r.json();
      })
      .then(({ inputDir, outputDir, subfolders, deleteAfterExtraction, queueMode }) => {
        setInputDir(inputDir || '');
        setOutputDir(outputDir || '');
        setSubfolders(subfolders !== false);
        setDeleteAfterExtraction(!!deleteAfterExtraction);
        setQueueMode(!!queueMode);
        setError('');
      })
      .catch(err => {
        setError('Unable to load settings: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputDir, outputDir, subfolders, deleteAfterExtraction, queueMode })
      });
      if (!res.ok) throw new Error('Failed to save settings');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <Card className="w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xl" onClick={onClose} aria-label="Close">×</button>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading settings…</div>
          ) : error ? (
            <div className="text-destructive text-center py-8" role="alert">{error}</div>
          ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="inputDir" className="text-sm">Input Directory</label>
              <Input
                id="inputDir"
                type="text"
                value={inputDir}
                onChange={e => setInputDir(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="outputDir" className="text-sm">Output Directory</label>
              <Input
                id="outputDir"
                type="text"
                value={outputDir}
                onChange={e => setOutputDir(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="subfolders"
                type="checkbox"
                checked={subfolders}
                onChange={e => setSubfolders(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              <label htmlFor="subfolders" className="text-sm">Extract into subfolders</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="deleteAfterExtraction"
                type="checkbox"
                checked={deleteAfterExtraction}
                onChange={e => setDeleteAfterExtraction(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              <label htmlFor="deleteAfterExtraction" className="text-sm">Delete file after extraction</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="queueMode"
                type="checkbox"
                checked={queueMode}
                onChange={e => setQueueMode(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              <label htmlFor="queueMode" className="text-sm">Queue extraction jobs (manual start)</label>
            </div>
            {error && <div className="text-destructive text-sm text-center" role="alert">{error}</div>}

            <Button type="submit" className="w-full mt-2" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
