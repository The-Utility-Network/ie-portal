'use client'

import React, { useMemo, useState } from 'react';
import { readContract } from 'thirdweb';
import { contract } from '../primitives/TSPABI';

type Facet = { facetAddress: string; selectors: string[] };
type MethodNames = { [facetAddress: string]: { readMethods: string[]; writeMethods: string[] } };
type FacetNames = { [facetAddress: string]: string };

type Props = {
  facets: Facet[];
  methodNames: MethodNames;
  facetNames: FacetNames;
};

function parseParams(raw: string) {
  if (!raw.trim()) return [] as any[];
  return raw.split(',').map((p) => {
    const v = p.trim();
    if (/^\d+$/.test(v)) return BigInt(v);
    if (/^\d+\.\d+$/.test(v)) return Number(v);
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
    return v;
  });
}

export default function DiamondFlow({ facets, methodNames, facetNames }: Props) {
  const [selection, setSelection] = useState<{ facet: string; method: string; type: 'read' | 'write' } | null>(null);
  const [params, setParams] = useState('');
  const [output, setOutput] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const positions = useMemo(() => {
    const w = 1200;
    const h = 800;
    const cx = w / 2;
    const cy = h / 2;
    const facetRadius = 250;
    const result: { [facet: string]: { x: number; y: number; reads: { [m: string]: { x: number; y: number } }; writes: { [m: string]: { x: number; y: number } } } } = {};
    facets.forEach((f, i) => {
      const angle = (i / Math.max(1, facets.length)) * Math.PI * 2 - Math.PI / 2;
      const fx = cx + Math.cos(angle) * facetRadius;
      const fy = cy + Math.sin(angle) * facetRadius;
      const reads = methodNames[f.facetAddress]?.readMethods || [];
      const writes = methodNames[f.facetAddress]?.writeMethods || [];
      const readsMap: any = {};
      const writesMap: any = {};
      const r1 = 110;
      const r2 = 160;
      reads.forEach((m, idx) => {
        const a = angle + (idx / Math.max(1, reads.length)) * Math.PI * 2;
        readsMap[m] = { x: fx + Math.cos(a) * r1, y: fy + Math.sin(a) * r1 };
      });
      writes.forEach((m, idx) => {
        const a = angle + (idx / Math.max(1, writes.length)) * Math.PI * 2 + Math.PI / 6;
        writesMap[m] = { x: fx + Math.cos(a) * r2, y: fy + Math.sin(a) * r2 };
      });
      result[f.facetAddress] = { x: fx, y: fy, reads: readsMap, writes: writesMap };
    });
    return { w, h, cx, cy, map: result };
  }, [facets, methodNames]);

  const runRead = async () => {
    if (!selection) return;
    setBusy(true);
    setOutput('');
    try {
      const res = await readContract({
        contract,
        method: selection.method as any,
        params: parseParams(params) as any,
      } as any);
      setOutput(typeof res === 'object' ? JSON.stringify(res) : String(res));
    } catch (e: any) {
      setOutput(e?.message || 'Read failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full h-full" style={{ position: 'absolute', inset: 0 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${positions.w} ${positions.h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#341099" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0b0b0b" stopOpacity="0.9" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={0} y={0} width={positions.w} height={positions.h} fill="url(#bgGlow)" />

        {/* Center diamond marker */}
        <g>
          <circle cx={positions.cx} cy={positions.cy} r={6} fill="#7f2cff" />
          <text x={positions.cx + 10} y={positions.cy + 4} fill="#e0ccff" fontSize={14}>Diamond</text>
        </g>

        {/* Facet nodes and methods */}
        {facets.map((f) => {
          const pos = positions.map[f.facetAddress];
          const name = facetNames[f.facetAddress] || f.facetAddress.slice(0, 6);
          return (
            <g key={f.facetAddress}>
              {/* facet */}
              <g filter="url(#softGlow)">
                <circle cx={pos.x} cy={pos.y} r={18} fill="#7f2cff" stroke="#aa73ff" strokeWidth={2} />
                <text x={pos.x + 24} y={pos.y + 4} fill="#e0ccff" fontSize={12}>{name}</text>
              </g>

              {/* reads */}
              {Object.keys(pos.reads).map((m) => (
                <g key={`r-${m}`} onClick={() => setSelection({ facet: f.facetAddress, method: m, type: 'read' })} style={{ cursor: 'pointer' }}>
                  <line x1={pos.x} y1={pos.y} x2={pos.reads[m].x} y2={pos.reads[m].y} stroke="#aa73ff" strokeOpacity={0.5} />
                  <circle cx={pos.reads[m].x} cy={pos.reads[m].y} r={10} fill="#aa73ff" />
                  <text x={pos.reads[m].x + 12} y={pos.reads[m].y + 4} fill="#e0ccff" fontSize={11}>{m}</text>
                </g>
              ))}

              {/* writes */}
              {Object.keys(pos.writes).map((m) => (
                <g key={`w-${m}`} onClick={() => setSelection({ facet: f.facetAddress, method: m, type: 'write' })} style={{ cursor: 'pointer' }}>
                  <line x1={pos.x} y1={pos.y} x2={pos.writes[m].x} y2={pos.writes[m].y} stroke="#c229f5" strokeOpacity={0.4} />
                  <rect x={pos.writes[m].x - 10} y={pos.writes[m].y - 10} width={20} height={20} rx={4} fill="#c229f5" />
                  <text x={pos.writes[m].x + 12} y={pos.writes[m].y + 4} fill="#e0ccff" fontSize={11}>{m}</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Inspector panel */}
      <div
        className="rounded-lg"
        style={{
          position: 'absolute', right: 20, top: 20, width: 360, maxWidth: '90vw',
          background: 'rgba(52, 16, 153, 0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #7f2cff', boxShadow: '0 0 18px rgba(127,44,255,0.5)', color: '#ECFDF5', padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Diamond Flow</div>
        {selection ? (
          <>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Facet</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{facetNames[selection.facet] || selection.facet.slice(0, 10)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Method</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selection.method}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Type</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selection.type.toUpperCase()}</div>

            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Params (comma-separated)</div>
            <input
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="e.g. 1, 0xabc..., true"
              style={{ width: '100%', borderRadius: 8, padding: 8, color: '#fff', background: 'rgba(0,0,0,0.25)', border: '1px solid #aa73ff' }}
            />
            <div style={{ height: 8 }} />
            {selection.type === 'read' ? (
              <button
                disabled={busy}
                onClick={runRead}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#7f2cff', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {busy ? 'Reading…' : 'Run Read'}
              </button>
            ) : (
              <button disabled title="Write execution coming next" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'rgba(122,44,255,0.5)', color: '#fff', border: '1px solid #7f2cff', cursor: 'not-allowed' }}>
                Run Write (soon)
              </button>
            )}

            <div style={{ height: 8 }} />
            {output && (
              <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, border: '1px solid #aa73ff' }}>{output}</div>
            )}
          </>
        ) : (
          <div style={{ color: '#e0ccff' }}>Select a method node to inspect and run reads.</div>
        )}
      </div>
    </div>
  );
}


