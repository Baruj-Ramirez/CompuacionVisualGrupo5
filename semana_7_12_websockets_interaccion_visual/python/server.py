"""Servidor WebSocket para el Taller.

Envía, cada 0.5 segundos, un JSON con esta estructura:
{
    "x": <float>,
    "y": <float>,
    "color": <str>
}

Pensado para conectarse luego desde un cliente web (Three.js / React Three Fiber)
y actualizar una figura en tiempo real.
"""

from __future__ import annotations

import asyncio
import json
import math
import random
from dataclasses import asdict, dataclass
from itertools import cycle

import websockets


HOST = "localhost"
PORT = 8765                  # per-client random-walk server (agents scene)
BROADCAST_PORT = 8766        # shared broadcast server (cardiac + manual control)
SEND_INTERVAL_SECONDS = 0.5

# NOTE: COLOR_SEQUENCE is NOT module-level.
# Each handler call creates its own local cycle so multiple simultaneous
# clients (e.g. 4 agent connections) get independent color progressions.


@dataclass(slots=True)
class Payload:
    x: float
    y: float
    color: str
    t: int


async def handler(websocket: websockets.WebSocketServerProtocol) -> None:
    """Atiende a cada cliente conectado y le envía datos en tiempo real.

    Cada invocación de handler mantiene su propio estado (posición, color)
    para que múltiples clientes simultáneos reciban caminatas aleatorias
    completamente independientes.
    """
    tick = 0
    current_x = 0.0
    current_y = 0.0
    # Local color cycle per connection – avoids shared state across clients
    color_cycle = cycle(["red", "green", "blue", "yellow", "orange", "purple"])

    try:
        while True:
            # Movimiento tipo caminata aleatoria suave para que la animación se vea natural.
            current_x += random.uniform(-0.9, 0.9)
            current_y += random.uniform(-0.9, 0.9)

            # Limitar el rango para mantener el objeto dentro de la escena.
            current_x = max(-5.0, min(5.0, current_x))
            current_y = max(-5.0, min(5.0, current_y))

            message = Payload(
                x=round(current_x, 3),
                y=round(current_y, 3),
                color=next(color_cycle),
                t=tick,
            )

            await websocket.send(json.dumps(asdict(message), ensure_ascii=False))

            tick += 1
            await asyncio.sleep(SEND_INTERVAL_SECONDS)

    except websockets.ConnectionClosed:
        # El cliente cerró la conexión; no es un error.
        print("Cliente desconectado.")
    except Exception as exc:
        # Cualquier error inesperado se reporta para facilitar depuración.
        print(f"Error en el handler: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# Servidor de broadcast compartido (puerto 8766)
# Todas las conexiones reciben el MISMO estado en cada tick.
# Soporta dos modos:
#   "cardiac"  – genera una señal ECG sintética con BPM configurable.
#   "manual"   – usa las coordenadas X/Y enviadas por el panel de control.
# ═══════════════════════════════════════════════════════════════════════════════

# Estado compartido – acceso seguro porque asyncio es monohilo
broadcast_state: dict = {
    "mode":  "cardiac",   # "cardiac" | "manual"
    "x":     0.0,
    "y":     0.0,
    "color": "red",
    "bpm":   72,
}

# Conjunto de WebSockets actualmente conectados al servidor de broadcast
broadcast_clients: set = set()


def cardiac_sample(t: float, bpm: float = 72.0) -> float:
    """Genera una muestra sintética de señal ECG en el instante t (segundos).

    Compone las ondas P, Q, R, S, T de un ciclo cardíaco normalizado.
    El valor de retorno está aproximadamente en el rango [-0.2, 1.5].
    """
    period = 60.0 / bpm
    phase  = (t % period) / period          # 0 → 1 dentro de un latido

    p      =  0.15 * math.exp(-((phase - 0.12) ** 2) / 0.0005)
    q      = -0.10 * math.exp(-((phase - 0.30) ** 2) / 0.00008)
    r      =  1.50 * math.exp(-((phase - 0.32) ** 2) / 0.000025)  # pico R alto
    s      = -0.20 * math.exp(-((phase - 0.34) ** 2) / 0.00008)
    t_wave =  0.35 * math.exp(-((phase - 0.60) ** 2) / 0.002)

    return p + q + r + s + t_wave


async def broadcast_handler(websocket) -> None:
    """Atiende una conexión al servidor de broadcast.

    Registra al cliente y procesa mensajes de control entrantes
    (del panel HTML externo) para actualizar el estado compartido.
    """
    broadcast_clients.add(websocket)
    print(f"[broadcast] Cliente conectado. Total: {len(broadcast_clients)}")
    try:
        async for raw in websocket:
            try:
                msg   = json.loads(raw)
                mtype = msg.get("type", "")

                if mtype == "set_mode":
                    mode = msg.get("mode", "cardiac")
                    if mode in ("cardiac", "manual"):
                        broadcast_state["mode"] = mode

                elif mtype == "set_position":
                    # Recibido desde el panel de control manual
                    broadcast_state["x"]    = max(-5.0, min(5.0, float(msg.get("x", 0))))
                    broadcast_state["y"]    = max(-5.0, min(5.0, float(msg.get("y", 0))))
                    broadcast_state["mode"] = "manual"

                elif mtype == "set_color":
                    color = msg.get("color", "red")
                    broadcast_state["color"] = color

                elif mtype == "set_bpm":
                    bpm = int(msg.get("bpm", 72))
                    broadcast_state["bpm"] = max(30, min(220, bpm))

            except (json.JSONDecodeError, ValueError, KeyError, TypeError):
                pass   # ignorar mensajes malformados

    except websockets.ConnectionClosed:
        pass
    finally:
        broadcast_clients.discard(websocket)
        print(f"[broadcast] Cliente desconectado. Total: {len(broadcast_clients)}")


async def broadcast_loop() -> None:
    """Bucle continuo: calcula el estado actual y lo transmite a todos los clientes.

    Frecuencia: ~12.5 Hz (80 ms) para que la curva ECG se vea fluida.
    """
    tick       = 0
    loop_start = asyncio.get_event_loop().time()

    while True:
        t    = asyncio.get_event_loop().time() - loop_start
        mode = broadcast_state["mode"]
        bpm  = broadcast_state["bpm"]

        if mode == "cardiac":
            sig   = cardiac_sample(t, bpm)
            # X scrolls through a 10-unit window mapped to -5..5
            x_val = (t % 10.0) / 10.0 * 10.0 - 5.0
            payload = {
                "x":      round(x_val, 3),
                "y":      round(sig * 3.0, 3),
                "color":  "red" if sig > 0.8 else broadcast_state["color"],
                "t":      tick,
                "mode":   "cardiac",
                "signal": round(sig, 4),
                "bpm":    bpm,
            }
        else:  # manual
            payload = {
                "x":      round(broadcast_state["x"],    3),
                "y":      round(broadcast_state["y"],    3),
                "color":  broadcast_state["color"],
                "t":      tick,
                "mode":   "manual",
                "signal": 0.0,
                "bpm":    bpm,
            }

        if broadcast_clients:
            message = json.dumps(payload, ensure_ascii=False)
            dead: set = set()
            for ws in list(broadcast_clients):
                try:
                    await ws.send(message)
                except websockets.ConnectionClosed:
                    dead.add(ws)
            for ws in dead:
                broadcast_clients.discard(ws)   # mutate in-place; no rebinding → no UnboundLocalError

        tick += 1
        await asyncio.sleep(0.08)   # ~12.5 Hz


async def main() -> None:
    print("Servidores WebSocket iniciados:")
    print(f"  [por cliente] ws://{HOST}:{PORT}  → caminata aleatoria independiente por conexión")
    print(f"  [broadcast  ] ws://{HOST}:{BROADCAST_PORT} → señal compartida cardíaca / control manual")

    async with websockets.serve(handler, HOST, PORT):
        async with websockets.serve(broadcast_handler, HOST, BROADCAST_PORT):
            await broadcast_loop()   # corre indefinidamente; mantiene vivos ambos servidores


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Servidor detenido manualmente.")
