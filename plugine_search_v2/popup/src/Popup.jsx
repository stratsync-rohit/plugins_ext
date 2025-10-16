import React, { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE) || 'http://localhost:4000/api';

export default function Popup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadSaved();
    showActiveTab();
  }, []);

  async function showActiveTab() {
    try {
      if (chrome?.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (tab) setQuery(tab.title || tab.url || '');
      }
    } catch (e) {
      // ignore in non-extension dev
    }
  }

  async function doSearch() {
    if (!query) return;
    setStatus('Searching...');
    try {
      // prefer backend proxy
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const items = data.items || data.relatedItems || [];
      setResults(items);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Search failed');
    }
  }

  async function loadSaved() {
    try {
      const res = await fetch(`${API_BASE}/items`);
      const data = await res.json();
      setSaved(data || []);
    } catch (err) {
      console.error('loadSaved', err);
    }
  }

  async function saveItem(item) {
    const body = {
      title: item.title || item.titleNoFormatting || item.snippet || 'Untitled',
      url: item.link || item.url,
      snippet: item.snippet || ''
    };
    await fetch(`${API_BASE}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    loadSaved();
  }

  return (
    <div style={{ width: 360, padding: 12, fontFamily: 'Inter, Arial, sans-serif' }}>
      <h3>Search & Save</h3>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <button onClick={doSearch} style={{ padding: '8px 12px' }}>Search</button>
      </div>

      <div style={{ marginTop: 8 }}>{status}</div>

      <div style={{ marginTop: 12 }}>
        <strong>Results</strong>
        <div>
          {results.length === 0 && <div style={{ color: '#666', marginTop: 6 }}>No results</div>}
          {results.map((r, i) => (
            <div key={i} style={{ background: '#f7f7f7', padding: 8, borderRadius: 6, marginTop: 8 }}>
              <a href={r.link || r.url || '#'} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{r.title || r.displayLink || r.snippet}</a>
              <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{r.snippet}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => saveItem(r)} style={{ padding: '6px 8px' }}>Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Saved</strong>
        <div>
          {saved.map(s => (
            <div key={s._id} style={{ background: '#fff', border: '1px solid #eee', padding: 8, borderRadius: 6, marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{s.url}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
