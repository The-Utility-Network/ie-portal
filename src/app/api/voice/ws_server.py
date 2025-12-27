import os
import asyncio
import json
import base64
import logging
import websockets
import uuid
from dotenv import load_dotenv

from typing import Dict, Any

# This server bridges browser clients to the Azure Voice Live Python client in the same container.
# It relays input audio from the browser to the Azure websocket and relays audio deltas back.

logger = logging.getLogger("voice_ws")

# Load .env so env vars work in local/dev and container if provided
try:
    load_dotenv()
except Exception:
    pass

AZURE_ENDPOINT = os.environ.get("AZURE_VOICE_LIVE_ENDPOINT", "")
AZURE_DEPLOYMENT = os.environ.get("AZURE_VOICE_LIVE_DEPLOYMENT", "") or os.environ.get("AZURE_OPENAI_DEPLOYMENT", "")
AZURE_API_KEY = os.environ.get("AZURE_VOICE_LIVE_API_KEY", "")

if not AZURE_ENDPOINT or not AZURE_DEPLOYMENT or not AZURE_API_KEY:
    logger.warning("Azure Voice Live env vars are not fully configured (endpoint/deployment/api key).")


async def open_azure_ws() -> websockets.WebSocketClientProtocol:
    # Use the Voice Agent realtime path (matches provided working snippet)
    base = AZURE_ENDPOINT.rstrip('/')
    url = f"{base}/voice-agent/realtime?api-version=2025-05-01-preview&model={AZURE_DEPLOYMENT}"
    url = url.replace("https://", "wss://")
    headers = {
        "api-key": AZURE_API_KEY,
        "x-ms-client-request-id": str(uuid.uuid4()),
        "User-Agent": "iehome-voice-agent/1.0",
    }
    return await websockets.connect(url, additional_headers=headers, max_size=None, ping_interval=20, ping_timeout=30)


async def relay_browser_to_azure(browser_ws: websockets.WebSocketServerProtocol, azure_ws: websockets.WebSocketClientProtocol, state: dict):
    try:
        async for message in browser_ws:
            if isinstance(message, bytes):
                # Raw PCM not expected; ignore
                continue
            try:
                data = json.loads(message)
            except Exception:
                continue
            # Handle application heartbeat locally
            if isinstance(data, dict) and data.get("type") == "ping":
                try:
                    await browser_ws.send(json.dumps({"type": "pong"}))
                except Exception:
                    pass
                continue
            # Ensure start event before first append
            if data.get("type") == "input_audio_buffer.append" and not state.get("started"):
                try:
                    await azure_ws.send(json.dumps({"type": "input_audio_buffer.start", "event_id": ""}))
                except Exception:
                    pass
                state["started"] = True
            # Forward JSON messages directly to Azure
            await azure_ws.send(json.dumps(data))
            # After commit, request a response to trigger TTS
            if data.get("type") == "input_audio_buffer.commit":
                try:
                    await azure_ws.send(json.dumps({
                        "type": "response.create",
                        "response": {
                            "modalities": ["audio"],
                            "instructions": "",
                        },
                    }))
                except Exception:
                    pass
    except websockets.exceptions.ConnectionClosed:
        pass


async def relay_azure_to_browser(browser_ws: websockets.WebSocketServerProtocol, azure_ws: websockets.WebSocketClientProtocol):
    try:
        async for message in azure_ws:
            # Azure sends JSON events; forward them to browser
            await browser_ws.send(message)
    except websockets.exceptions.ConnectionClosed:
        # Inform client Azure closed
        try:
            await browser_ws.send(json.dumps({"type": "server.status", "phase": "azure_closed"}))
        except Exception:
            pass


async def handler(browser_ws: websockets.WebSocketServerProtocol):
    azure_ws = None
    try:
        try:
            addr = getattr(browser_ws, 'remote_address', None)
            path = getattr(browser_ws, 'path', '')
            logger.info(f"Incoming WS client: {addr}, path={path}")
            print(f"Incoming WS client: {addr}, path={path}")
        except Exception:
            pass
        # Inform client WS is open early
        try:
            await browser_ws.send(json.dumps({"type": "server.status", "phase": "ws_open"}))
        except Exception:
            pass
        # Preflight env check
        if not AZURE_ENDPOINT or not AZURE_DEPLOYMENT or not AZURE_API_KEY:
            err = json.dumps({"type": "error", "reason": "azure_env_missing", "message": "Azure Voice Live env vars are not fully configured."})
            try:
                await browser_ws.send(err)
            finally:
                await browser_ws.close()
            return

        # Inform client we are connecting to Azure
        try:
            await browser_ws.send(json.dumps({"type": "server.status", "phase": "azure_connecting"}))
        except Exception:
            pass

        try:
            azure_ws = await open_azure_ws()
        except Exception as e:
            # Inform client that Azure connect failed and close
            try:
                await browser_ws.send(json.dumps({
                    "type": "error",
                    "reason": "azure_connect_failed",
                    "message": str(e),
                }))
            finally:
                await browser_ws.close()
            logger.exception("Azure Voice Live connect failed")
            return

        # Inform client we are ready
        try:
            await browser_ws.send(json.dumps({"type": "server.status", "phase": "ready"}))
        except Exception:
            pass
        # Configure session
        await azure_ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "input_audio_format": {"type": "pcm16", "sample_rate": 24000},
                "output_audio_format": {"type": "pcm16", "sample_rate": 24000},
                "turn_detection": {
                    "type": "azure_semantic_vad",
                    "threshold": 0.3,
                    "prefix_padding_ms": 200,
                    "silence_duration_ms": 500,
                    "end_of_utterance_detection": {
                        "model": "semantic_detection_v1",
                        "threshold": 0.01,
                        "timeout": 2,
                    },
                },
                "input_audio_noise_reduction": {"type": "azure_deep_noise_suppression"},
                "input_audio_echo_cancellation": {"type": "server_echo_cancellation"},
                "voice": {"name": "en-US-Ava:DragonHDLatestNeural", "type": "azure-standard", "temperature": 0.8},
                "output_audio_timestamp_types": ["word"],
            }
        }))

        # Keepalive task: send brief silence until first real audio arrives
        state = {"started": False, "stopped": False}
        async def keepalive_silence():
            try:
                # send start once
                await azure_ws.send(json.dumps({"type": "input_audio_buffer.start", "event_id": ""}))
                state["started"] = True
                # 20ms of silence at 24kHz = 480 samples
                import base64
                import array
                silence = array.array('h', [0] * 480).tobytes()
                b64 = base64.b64encode(silence).decode('utf-8')
                for _ in range(50):  # ~10s
                    if state.get("stopped") or state.get("got_audio"):
                        break
                    await azure_ws.send(json.dumps({"type": "input_audio_buffer.append", "audio": b64, "event_id": ""}))
                    await asyncio.sleep(0.2)
            except Exception:
                pass

        ka_task = asyncio.create_task(keepalive_silence())

        task_up = asyncio.create_task(relay_browser_to_azure(browser_ws, azure_ws, state))
        task_down = asyncio.create_task(relay_azure_to_browser(browser_ws, azure_ws))
        await asyncio.wait([task_up, task_down], return_when=asyncio.FIRST_COMPLETED)
    finally:
        try:
            if azure_ws:
                await azure_ws.close()
        except Exception:
            pass


async def main():
    host = os.environ.get("VOICE_WS_HOST", "0.0.0.0")
    port = int(os.environ.get("VOICE_WS_PORT", "8765"))
    async with websockets.serve(handler, host, port, max_size=None):
        print(f"Voice WS server listening on ws://{host}:{port}/client")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass


