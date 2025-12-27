'use client'

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
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

function FloatingDiamond() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.2;
    ref.current.rotation.x = Math.sin(t * 0.15) * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <octahedronGeometry args={[1.2, 0]} />
      <meshPhysicalMaterial
        color={new THREE.Color('#7f2cff')}
        metalness={0.3}
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.1}
        transmission={0.25}
        transparent
      />
    </mesh>
  );
}

function Node({ position, color, onClick, label }: { position: [number, number, number]; color: string; onClick?: () => void; label?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() + position[0]) * 0.05;
  });
  return (
    <group position={position}>
      <mesh ref={ref} onClick={onClick} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={0.6} />
      </mesh>
      {label && (
        <Html distanceFactor={12} style={{ pointerEvents: 'none' }} position={[0.12, 0.12, 0]}>
          <div style={{ color: '#e0ccff', fontSize: 10, textShadow: '0 0 4px rgba(127,44,255,0.8)' }}>{label}</div>
        </Html>
      )}
    </group>
  );
}

export default function Diamond3D({ facets, methodNames, facetNames }: Props) {
  const [selected, setSelected] = useState<{ facet: string; method: string; type: 'read' | 'write' } | null>(null);
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const facetPositions = useMemo(() => {
    const count = facets.length || 1;
    const radius = 3.2;
    return facets.map((_, i) => {
      const phi = (i / count) * Math.PI * 2;
      const x = Math.cos(phi) * radius;
      const z = Math.sin(phi) * radius;
      const y = Math.sin(phi * 1.3) * 0.8;
      return [x, y, z] as [number, number, number];
    });
  }, [facets]);

  const methodPositions = useMemo(() => {
    // Build a map facet -> positions for its methods around its position
    const map: { [facet: string]: { [key: string]: [number, number, number] } } = {};
    facets.forEach((facet, idx) => {
      const center = facetPositions[idx];
      const reads = methodNames[facet.facetAddress]?.readMethods || [];
      const writes = methodNames[facet.facetAddress]?.writeMethods || [];

      const place = (names: string[], radius: number, angleOffset: number) => {
        names.forEach((name, i) => {
          const phi = angleOffset + (i / Math.max(1, names.length)) * Math.PI * 2;
          const pos: [number, number, number] = [
            center[0] + Math.cos(phi) * radius,
            center[1] + Math.sin(phi * 2) * 0.3,
            center[2] + Math.sin(phi) * radius,
          ];
          map[facet.facetAddress] = map[facet.facetAddress] || {};
          map[facet.facetAddress][name] = pos;
        });
      };

      place(reads, 0.9, 0);
      place(writes, 1.3, Math.PI / 6);
    });
    return map;
  }, [facets, facetPositions, methodNames]);

  const parseParams = (raw: string) => {
    if (!raw.trim()) return [] as any[];
    return raw.split(',').map((p) => {
      const v = p.trim();
      if (/^\d+$/.test(v)) return BigInt(v);
      if (/^\d+\.\d+$/.test(v)) return Number(v);
      if (v.toLowerCase() === 'true') return true;
      if (v.toLowerCase() === 'false') return false;
      return v;
    });
  };

  const executeRead = async () => {
    if (!selected) return;
    setBusy(true);
    setResult('');
    try {
      const params = parseParams(input);
      const value = await readContract({
        contract,
        method: selected.method as any,
        params: params as any,
      } as any);
      setResult(typeof value === 'object' ? JSON.stringify(value) : String(value));
    } catch (e: any) {
      setResult(e?.message || 'Read failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full h-full" style={{ position: 'absolute', inset: 0 }}>
      <Canvas camera={{ position: [0, 2.5, 6], fov: 45 }} shadows>
        <color attach="background" args={[0x0b0b0b]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 6, 4]} intensity={1.2} color={new THREE.Color('#aa73ff')} />
        <pointLight position={[-4, -3, -4]} intensity={0.6} color={new THREE.Color('#7f2cff')} />

        <FloatingDiamond />

        {/* Facets */}
        {facets.map((facet, idx) => {
          const pos = facetPositions[idx];
          const fname = facetNames[facet.facetAddress] || facet.facetAddress.slice(0, 6);
          return (
            <group key={facet.facetAddress}>
              <Node position={pos as [number, number, number]} color="#7f2cff" label={fname} />

              {/* Read methods */}
              {(methodNames[facet.facetAddress]?.readMethods || []).map((m) => (
                <Node
                  key={`${facet.facetAddress}-read-${m}`}
                  position={methodPositions[facet.facetAddress]?.[m] || pos}
                  color="#aa73ff"
                  label={m}
                  onClick={() => setSelected({ facet: facet.facetAddress, method: m, type: 'read' })}
                />
              ))}

              {/* Write methods */}
              {(methodNames[facet.facetAddress]?.writeMethods || []).map((m) => (
                <Node
                  key={`${facet.facetAddress}-write-${m}`}
                  position={methodPositions[facet.facetAddress]?.[m] || pos}
                  color="#c229f5"
                  label={m}
                  onClick={() => setSelected({ facet: facet.facetAddress, method: m, type: 'write' })}
                />
              ))}
            </group>
          );
        })}

        <OrbitControls enableDamping dampingFactor={0.08} />
      </Canvas>

      {/* Side panel */}
      <div
        className="rounded-lg"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 340,
          maxWidth: '90vw',
          background: 'rgba(52, 16, 153, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #7f2cff',
          boxShadow: '0 0 18px rgba(127,44,255,0.5)',
          color: '#ECFDF5',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>Diamond 3D</div>
          <button onClick={() => setSelected(null)} style={{ color: '#e0ccff' }}>Clear</button>
        </div>
        <div style={{ height: 8 }} />

        {selected ? (
          <div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Facet</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{facetNames[selected.facet] || selected.facet.slice(0, 10)}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Method</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selected.method}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>Type</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selected.type.toUpperCase()}</div>

            {selected.type === 'read' ? (
              <>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Params (comma-separated)</div>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. 1, 0xabc..., true"
                  style={{ width: '100%', borderRadius: 8, padding: 8, color: '#fff', background: 'rgba(0,0,0,0.25)', border: '1px solid #aa73ff' }}
                />
                <div style={{ height: 8 }} />
                <button
                  disabled={busy}
                  onClick={executeRead}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#7f2cff',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {busy ? 'Reading…' : 'Run Read'}
                </button>
                <div style={{ height: 8 }} />
                {result && (
                  <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, border: '1px solid #aa73ff' }}>
                    {result}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Params (comma-separated)</div>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. 1, 0xabc..., true"
                  style={{ width: '100%', borderRadius: 8, padding: 8, color: '#fff', background: 'rgba(0,0,0,0.25)', border: '1px solid #aa73ff' }}
                />
                <div style={{ height: 8 }} />
                <button
                  disabled
                  title="Write execution coming next"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(122, 44, 255, 0.5)',
                    color: '#fff',
                    border: '1px solid #7f2cff',
                    cursor: 'not-allowed',
                  }}
                >
                  Run Write (soon)
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ color: '#e0ccff' }}>Select a method node to inspect and run reads.</div>
        )}
      </div>
    </div>
  );
}


