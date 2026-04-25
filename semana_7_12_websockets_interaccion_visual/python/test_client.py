import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            data = json.loads(msg)
            print(f"x={data['x']} | y={data['y']} | color={data['color']}")

asyncio.run(test())