'use client';
import React, { useEffect, useRef, useState } from 'react';

type VoiceAgentModalProps = {
	open: boolean;
	onClose: () => void;
};

// Very small PCM player with resampling to the AudioContext sampleRate
function usePcmPlayer() {
	const audioCtxRef = useRef<AudioContext | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const queueRef = useRef<Float32Array[]>([]);

	useEffect(() => {
		return () => {
			processorRef.current?.disconnect();
			audioCtxRef.current?.close();
		};
	}, []);

	const start = () => {
		if (!audioCtxRef.current) {
			audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
		if (!processorRef.current && audioCtxRef.current) {
			processorRef.current = audioCtxRef.current.createScriptProcessor(2048, 1, 1);
			processorRef.current.onaudioprocess = (e) => {
				const output = e.outputBuffer.getChannelData(0);
				output.fill(0);
				let offset = 0;
				while (queueRef.current.length > 0 && offset < output.length) {
					const chunk = queueRef.current[0];
					const copyLen = Math.min(chunk.length, output.length - offset);
					output.set(chunk.subarray(0, copyLen), offset);
					offset += copyLen;
					if (copyLen < chunk.length) {
						queueRef.current[0] = chunk.subarray(copyLen);
						break;
					} else {
						queueRef.current.shift();
					}
				}
			};
			processorRef.current.connect(audioCtxRef.current.destination);
		}
	};

	const stop = () => {
		processorRef.current?.disconnect();
		processorRef.current = null;
		audioCtxRef.current?.close();
		audioCtxRef.current = null;
		queueRef.current = [];
	};

	const enqueuePcm = (int16Pcm: Int16Array, fromSampleRate = 24000) => {
		if (!audioCtxRef.current) return;
		const targetRate = audioCtxRef.current.sampleRate;
		// Convert to Float32 [-1,1]
		const float32 = new Float32Array(int16Pcm.length);
		for (let i = 0; i < int16Pcm.length; i++) {
			float32[i] = int16Pcm[i] / 32768;
		}
		// Resample if needed
		if (fromSampleRate === targetRate) {
			queueRef.current.push(float32);
			return;
		}
		const ratio = targetRate / fromSampleRate;
		const newLen = Math.max(1, Math.floor(float32.length * ratio));
		const resampled = new Float32Array(newLen);
		for (let i = 0; i < newLen; i++) {
			const srcIndex = i / ratio;
			const i0 = Math.floor(srcIndex);
			const i1 = Math.min(float32.length - 1, i0 + 1);
			const t = srcIndex - i0;
			resampled[i] = float32[i0] * (1 - t) + float32[i1] * t;
		}
		queueRef.current.push(resampled);
	};

	return { start, stop, enqueuePcm };
}

export default function VoiceAgentModal({ open, onClose }: VoiceAgentModalProps) {
	const [connected, setConnected] = useState(false);
	const [recording, setRecording] = useState(false);
	const [statusText, setStatusText] = useState<string>('');
	const wsRef = useRef<WebSocket | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const { start: startPlayer, stop: stopPlayer, enqueuePcm } = usePcmPlayer();

	useEffect(() => {
		if (!open) {
			cleanup();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const cleanup = () => {
		stopCapture();
		wsRef.current?.close();
		wsRef.current = null;
		stopPlayer();
		setConnected(false);
		setRecording(false);
		setStatusText('');
	};

	const connect = async () => {
		try {
			setStatusText('Connecting…');
			const resolveWsUrl = (): string => {
				const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
				const wsProto = isHttps ? 'wss:' : 'ws:';
				// Always use reverse-proxied relative path to avoid exposing host/port
				try {
					const abs = new URL('/voice', window.location.href);
					abs.protocol = wsProto;
					return abs.toString();
				} catch {}
				// Fallback
				const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
				return `${wsProto}//${host}/voice`;
			};

			const resolvedUrl = resolveWsUrl();
			const url = (() => {
				try {
					// Normalize env URL like ws://0.0.0.0:8765/client to current host
					const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
					const u = new URL(resolvedUrl);
					const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
					if (u.hostname === '0.0.0.0' || (u.hostname === '127.0.0.1' && currentHost !== 'localhost')) {
						u.hostname = currentHost;
					}
					if (isHttps && u.protocol === 'ws:') {
						u.protocol = 'wss:';
					}
					return u.toString();
				} catch {
					return resolvedUrl;
				}
			})();
			const ws = new WebSocket(url);
			ws.binaryType = 'arraybuffer';
			let pingTimer: any;
			ws.onopen = () => {
				setConnected(true);
				setStatusText('Connected');
				startPlayer();
				// heartbeat ping every 20s
				pingTimer = setInterval(() => {
					try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
				}, 20000);
			};
			ws.onmessage = (evt) => {
				// Expect JSON with base64 or raw ArrayBuffer
				if (evt.data instanceof ArrayBuffer) {
					const int16 = new Int16Array(evt.data);
					enqueuePcm(int16, 24000);
				} else {
					try {
						const msg = JSON.parse(evt.data);
						if (msg?.type === 'error' && msg?.reason === 'azure_env_missing') {
							setStatusText('Azure Voice Live env vars missing. Set AZURE_VOICE_LIVE_ENDPOINT, AZURE_VOICE_LIVE_DEPLOYMENT, AZURE_VOICE_LIVE_API_KEY.');
							return;
						}
						if (msg?.type === 'error' && msg?.reason === 'azure_connect_failed') {
							setStatusText(`Azure connect failed: ${msg.message || 'unknown error'}`);
							return;
						}
						if (msg?.type === 'server.status') {
							if (msg.phase === 'azure_connecting') setStatusText('Connecting to Azure…');
							if (msg.phase === 'ready') setStatusText('Connected to Azure. Ready.');
						}
						if (msg.type === 'response.audio.delta' && msg.delta) {
							const bytes = Uint8Array.from(atob(msg.delta), c => c.charCodeAt(0));
							enqueuePcm(new Int16Array(bytes.buffer), 24000);
						}
					} catch {}
				}
			};
			ws.onerror = (e: any) => {
				setStatusText('WebSocket error. Check URL/SSL/port.');
			};
			ws.onclose = (evt) => {
				setConnected(false);
				setRecording(false);
				setStatusText(`Disconnected (${evt.code}${evt.reason ? `: ${evt.reason}` : ''})`);
				if (pingTimer) clearInterval(pingTimer);
			};
			wsRef.current = ws;

			// connection timeout in case of silent drops
			setTimeout(() => {
				if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
					setStatusText(`Timeout connecting to ${url}`);
				}
			}, 5000);
		} catch (e) {
			setStatusText('Failed to connect');
		}
	};

	const startCapture = async () => {
		try {
			if (!connected) await connect();
			const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true }, video: false });
			mediaStreamRef.current = stream;
			audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
			const source = audioCtxRef.current.createMediaStreamSource(stream);
			scriptNodeRef.current = audioCtxRef.current.createScriptProcessor(2048, 1, 1);
			scriptNodeRef.current.onaudioprocess = (e) => {
				// Guard against race conditions if the context was closed
				const ctx = audioCtxRef.current;
				if (!ctx) return;
				const input = e.inputBuffer.getChannelData(0);
				// Downsample from ctx rate to 24000, then encode Int16
				const fromRate = ctx.sampleRate;
				const ratio = 24000 / fromRate;
				const newLen = Math.max(1, Math.floor(input.length * ratio));
				const resampled = new Float32Array(newLen);
				for (let i = 0; i < newLen; i++) {
					const srcIndex = i / ratio;
					const i0 = Math.floor(srcIndex);
					const i1 = Math.min(input.length - 1, i0 + 1);
					const t = srcIndex - i0;
					resampled[i] = input[i0] * (1 - t) + input[i1] * t;
				}
				const int16 = new Int16Array(resampled.length);
				for (let i = 0; i < resampled.length; i++) {
					let s = Math.max(-1, Math.min(1, resampled[i]));
					int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
				}
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					// Wrap as JSON per the Azure style
					const b64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(int16.buffer)) as any));
					const payload = { type: 'input_audio_buffer.append', audio: b64, event_id: '' };
					wsRef.current.send(JSON.stringify(payload));
				}
			};
			source.connect(scriptNodeRef.current);
			scriptNodeRef.current.connect(audioCtxRef.current.destination);
			setRecording(true);
			setStatusText('Listening…');
		} catch (e) {
			setStatusText('Mic permission denied');
		}
	};

	const stopCapture = () => {
		if (scriptNodeRef.current) {
			scriptNodeRef.current.onaudioprocess = null;
			scriptNodeRef.current.disconnect();
		}
		scriptNodeRef.current = null;
		if (audioCtxRef.current) {
			try { audioCtxRef.current.close(); } catch {}
		}
		audioCtxRef.current = null;
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((t) => t.stop());
			mediaStreamRef.current = null;
		}
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit', event_id: '' }));
		}
		setRecording(false);
		setStatusText('Paused');
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />
			<div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl shadow-2xl p-5">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-white text-sm font-semibold tracking-wide">Voice Agent</h3>
					<button onClick={onClose} className="text-white/70 hover:text-white text-sm">Close</button>
				</div>
				<div className="text-white/80 text-xs mb-4 min-h-[20px]">{statusText}</div>
				<div className="flex items-center gap-3">
					<button
						onClick={recording ? stopCapture : startCapture}
						className={`px-4 py-2 rounded-full border border-white/10 backdrop-blur-md ${recording ? 'bg-red-500/60 hover:bg-red-500/70' : 'bg-emerald-600/40 hover:bg-emerald-600/60'} text-white text-sm shadow`}
					>
						{recording ? 'Stop' : 'Start'}
					</button>
					<button
						onClick={connected ? cleanup : connect}
						className="px-4 py-2 rounded-full border border-white/10 backdrop-blur-md bg-white/10 hover:bg-white/20 text-white text-sm shadow"
					>
						{connected ? 'Disconnect' : 'Connect'}
					</button>
				</div>
			</div>
		</div>
	);
}


