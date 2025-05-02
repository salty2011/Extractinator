import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useArchives } from './Dashboard';

const API_URL = (typeof globalThis !== 'undefined' && (globalThis as any).VITE_API_URL) || '/api';

export default function ManualExtract({ onJobStarted }: { onJobStarted: () => void }) {
  const archives = useArchives();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [queueMode, setQueueMode] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/settings`).then(r => r.json()).then(cfg => setQueueMode(!!cfg.queueMode));
  }, []);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selected })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSuccess('Extraction started.');
      onJobStarted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredArchives = archives.filter((a: { file: string }) => a.file.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <Card className="w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xl" onClick={onJobStarted} aria-label="Close">×</button>
        <CardHeader>
          <CardTitle>Manual Extract</CardTitle>
        </CardHeader>
        <CardContent>
          {queueMode && <div className="mb-2 text-xs text-purple-800 bg-purple-100 rounded px-2 py-1">Queue mode is enabled. Files will be queued for extraction until you click "Extract Queued" on the dashboard.</div>}
          <form onSubmit={handleExtract} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="archive-search" className="text-sm">Search Archives</label>
              <Input
                id="archive-search"
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="archive" className="text-sm">Archive</label>
              <select
                id="archive"
                className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                value={selected}
                onChange={e => setSelected(e.target.value)}
                required
              >
                <option value="" disabled>Select archive…</option>
                {filteredArchives.map((a: { file: string }) => <option key={a.file} value={a.file}>{a.file}</option>)}
              </select>
            </div>
            {error && <div className="text-destructive text-sm text-center" role="alert">{error}</div>}
            {success && <div className="text-green-700 text-sm text-center" role="alert">{success}</div>}
            <Button type="submit" className="w-full mt-2" disabled={loading || !selected}>
              {loading ? (queueMode ? 'Queueing…' : 'Extracting…') : (queueMode ? 'Queue' : 'Extract')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
