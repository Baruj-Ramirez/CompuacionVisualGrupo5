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
import random
from dataclasses import asdict, dataclass
from itertools import cycle
from typing import Any

import websockets


HOST = "localhost"
PORT = 8765
SEND_INTERVAL_SECONDS = 0.5

# Paleta simple para que el cliente pueda mapear colores fácilmente.
COLOR_SEQUENCE = cycle(["red", "green", "blue", "yellow", "orange", "purple"])


@dataclass(slots=True)
class Payload:
    x: float
    y: float
    color: str
    t: int


async def handler(websocket: websockets.WebSocketServerProtocol) -> None:
    """Atiende a cada cliente conectado y le envía datos en tiempo real."""
    tick = 0
    current_x = 0.0
    current_y = 0.0

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
                color=next(COLOR_SEQUENCE),
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


async def main() -> None:
    print(f"Iniciando servidor WebSocket en ws://{HOST}:{PORT}")
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # Mantener el servidor corriendo indefinidamente.


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Servidor detenido manualmente.")
