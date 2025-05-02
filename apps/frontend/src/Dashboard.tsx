import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Sun, Moon, Play, Trash } from "lucide-react";
import SettingsPanel from './SettingsPanel';
import ManualExtract from './ManualExtract';

const API_URL = (typeof globalThis !== 'undefined' && (globalThis as any).VITE_API_URL) || '/api';

function useJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    const es = new EventSource(`${API_URL}/jobs/stream`);
    es.onmessage = e => {
      const { jobs } = JSON.parse(e.data);
      setJobs(jobs);
    };
    return () => es.close();
  }, []);
  return jobs;
}

export function useArchives() {
  const [archives, setArchives] = useState<{ file: string }[]>([]);
  useEffect(() => {
    const es = new EventSource(`${API_URL}/archives/stream`);
    es.onmessage = e => {
      const { archives } = JSON.parse(e.data);
      setArchives(archives);
    };
    return () => es.close();
  }, []);
  return archives;
}

function useAllProgress(jobIds: string[]) {
  const [progressMap, setProgressMap] = useState<Record<string, { progress: number, total: number }>>({});
  useEffect(() => {
    const sources: Record<string, EventSource> = {};
    jobIds.forEach(jobId => {
      if (!jobId) return;
      const es = new EventSource(`${API_URL}/progress/${jobId}`);
      es.onmessage = e => {
        setProgressMap(prev => ({ ...prev, [jobId]: JSON.parse(e.data) }));
      };
      sources[jobId] = es;
    });
    return () => { Object.values(sources).forEach(es => es.close()); };
  }, [JSON.stringify(jobIds)]);
  return progressMap;
}

export default function Dashboard() {
  // ...
  async function handleRemoveFromQueue(jobId: string) {
    await fetch(`${API_URL}/jobs/${jobId}`, { method: 'DELETE' });
  }
  const [showSettings, setShowSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const jobs = useJobs();
  const progressMap = useAllProgress(jobs.map(j => j.id));
  const [search, setSearch] = useState("");
  const [queueMode, setQueueMode] = useState(false);
  useEffect(() => {
    fetch(`${API_URL}/settings`).then(r => r.json()).then(cfg => setQueueMode(!!cfg.queueMode));
  }, []);

  // Compute global progress
  const totalBytes = jobs.reduce((acc, j) => acc + (j.total || 0), 0);
  const doneBytes = jobs.reduce((acc, j) => acc + (j.progress || (j.status === 'done' ? j.total : 0)), 0);
  const globalPct = totalBytes ? Math.round((doneBytes / totalBytes) * 100) : 0;

  const filteredJobs = jobs.filter(j =>
    j.file.toLowerCase().includes(search.toLowerCase()) ||
    (j.status && j.status.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleExtractQueued() {
    await fetch(`${API_URL}/process-queue`, { method: 'POST' });
  }

  async function handleExtractSingle(jobId: string) {
    await fetch(`${API_URL}/jobs/${jobId}/process`, { method: 'POST' });
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="bg-background shadow p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Extractinator</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)} aria-label="Settings">Settings</Button>
          <Button variant="outline" onClick={() => setShowManual(true)} aria-label="Manual Extract">Manual Extract</Button>
          <Button variant="secondary" onClick={() => { sessionStorage.clear(); window.location.reload(); }}>Logout</Button>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full p-4">
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={globalPct} max={100} className="flex-1 h-4" />
                <span className="text-xs font-mono w-10 text-right">{globalPct}%</span>
              </div>
            </CardContent>
          </Card>
        </section>
        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
            <h2 className="font-semibold">Archives</h2>
            <input
              type="text"
              placeholder="Search archives…"
              className="border rounded px-2 py-1 text-sm w-full md:w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {queueMode && (
            <div className="mb-2">
              <Button variant="default" onClick={handleExtractQueued} disabled={jobs.every(j => j.status !== 'queued')}>Extract Queued</Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border bg-background">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>File</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Progress</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredJobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No jobs found.</TableCell>
                  </TableRow>
                )}
                {filteredJobs.map(job => {
                  const progressObj = progressMap[job.id] || { progress: job.progress || 0, total: job.total || 0 };
                  const pct = progressObj.total ? Math.round((progressObj.progress / progressObj.total) * 100) : (job.status === 'done' ? 100 : 0);
                  return (
                    <TableRow key={job.id} className={job.status === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-mono text-xs truncate max-w-xs" title={job.file}>{job.file}</TableCell>
                      <TableCell><StatusBadge status={job.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} max={100} className={job.status === 'error' ? 'bg-destructive/30' : 'h-2'} />
                          <span className="text-xs font-mono w-10 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.status === 'queued' && queueMode && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleExtractSingle(job.id)}
                              title="Extract this job"
                              aria-label="Extract this job"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          {job.status === 'queued' && queueMode && (
                            <Button size="icon" variant="destructive" onClick={() => handleRemoveFromQueue(job.id)} title="Remove from queue" aria-label="Remove from queue">
                              <Trash className="w-4 h-4" />
                            </Button>
                          )}
                          {job.status === 'error' && (
                            <a href={`${API_URL}/jobs/${job.id}/log`} className="text-xs text-blue-700 underline" download>Download log</a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSaved={() => setRefresh(r => r + 1)} />}
        {showManual && <ManualExtract onJobStarted={() => { setShowManual(false); setRefresh(r => r + 1); }} />}
      </main>
    </div>
  );
}
