"""
PhoneDisplay Pro - Python Implementation (Ikkinchi Ekran Serveri)
Muallif: PhoneDisplay Pro Team
Tillar va kutubxonalar: Python 3, Flask, WebSockets, PyAutoGUI, MSS, Pillow

Bu skript Node.js versiyasiga alternativa bo'lib, butun ikkinchi ekran
va masofaviy boshqaruv tizimini Python tilida qanday qurish mumkinligini ko'rsatadi.
"""

import os
import sys
import json
import socket
import threading
import time
import io
from flask import Flask, send_from_directory, jsonify, request
from flask_sock import Sock

try:
    import mss
    import pyautogui
    from PIL import Image
    import qrcode
except ImportError:
    print("Diqqat: Kerakli kutubxonalarni o'rnatish uchun quyidagilarni bajaring:")
    print("pip install -r requirements.txt")

# PyAutoGUI xavfsizlik chegarasini o'chirish (tezkor harakat uchun)
try:
    pyautogui.PAUSE = 0.001
    pyautogui.FAILSAFE = False
except Exception:
    pass

app = Flask(__name__, static_folder="../public")
sock = Sock(app)

PORT = 5000

def get_lan_ip():
    """Mahalliy Wi-Fi yoki LAN IP manzilini aniqlash"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Haqiqiy paket jo'natilmaydi, faqat marshrut tekshiriladi
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

LOCAL_IP = get_lan_ip()

# Web routes
@app.route("/")
def index():
    host_hdr = request.headers.get("Host", "").lower()
    if "localhost" in host_hdr or "127.0.0.1" in host_hdr:
        return send_from_directory("../public", "host.html")
    return send_from_directory("../public", "index.html")

@app.route("/host")
def host():
    return send_from_directory("../public", "host.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory("../public", path)

@app.route("/api/info")
def api_info():
    screens = []
    try:
        with mss.mss() as sct:
            for idx, monitor in enumerate(sct.monitors[1:], start=1):
                screens.append({
                    "index": idx - 1,
                    "name": f"Ekran {idx}",
                    "primary": idx == 1,
                    "x": monitor["left"],
                    "y": monitor["top"],
                    "width": monitor["width"],
                    "height": monitor["height"]
                })
    except Exception:
        screens = [{"index": 0, "name": "Ekran 1", "primary": True, "x": 0, "y": 0, "width": 1920, "height": 1080}]

    return jsonify({
        "ip": LOCAL_IP,
        "port": PORT,
        "url": f"http://{LOCAL_IP}:{PORT}",
        "screens": screens
    })

# WebSocket handler for Touch/Mouse input and Signaling
connected_clients = set()
host_ws = None

@sock.route("/")
def ws_handler(ws):
    global host_ws
    role = "client"

    while True:
        try:
            msg_raw = ws.receive()
            if not msg_raw:
                break

            data = json.loads(msg_raw)
            msg_type = data.get("type")

            if msg_type == "register":
                role = data.get("role", "client")
                if role == "host":
                    host_ws = ws
                    print("💻 [Python Server] PC Host ulandi.")
                else:
                    connected_clients.add(ws)
                    print(f"📱 [Python Server] Telefon ulandi: {data.get('userAgent', 'Noma\'lum')}")
                    if host_ws:
                        try:
                            host_ws.send(json.dumps({
                                "type": "client_connected",
                                "clientId": id(ws),
                                "userAgent": data.get("userAgent", "Telefon"),
                                "time": time.strftime("%H:%M:%S")
                            }))
                        except Exception:
                            pass

            elif msg_type == "signal":
                # WebRTC signal relay
                if role == "host":
                    for client in list(connected_clients):
                        try:
                            client.send(json.dumps({"type": "signal", "data": data.get("data")}))
                        except Exception:
                            connected_clients.discard(client)
                elif role == "client" and host_ws:
                    try:
                        host_ws.send(json.dumps({"type": "signal", "from": id(ws), "data": data.get("data")}))
                    except Exception:
                        pass

            elif msg_type == "input":
                # Handle Touch and Mouse input on Windows via PyAutoGUI
                action = data.get("action")
                scr_w, scr_h = pyautogui.size()

                if action == "move":
                    x = int(data.get("x", 0) * scr_w)
                    y = int(data.get("y", 0) * scr_h)
                    pyautogui.moveTo(x, y)

                elif action == "click":
                    btn = data.get("button", "left")
                    if "x" in data and "y" in data:
                        x = int(data.get("x") * scr_w)
                        y = int(data.get("y") * scr_h)
                        pyautogui.click(x=x, y=y, button=btn)
                    else:
                        pyautogui.click(button=btn)

                elif action == "scroll":
                    delta = int(data.get("deltaY", 0))
                    pyautogui.scroll(delta)

                elif action == "text":
                    text = data.get("text", "")
                    if text:
                        pyautogui.write(text)

            elif msg_type == "ping":
                ws.send(json.dumps({"type": "pong", "clientTime": data.get("time")}))

        except Exception as e:
            break

    if ws == host_ws:
        host_ws = None
    connected_clients.discard(ws)

if __name__ == "__main__":
    print("=" * 60)
    print("   🐍 PhoneDisplay Pro - Python Server")
    print("=" * 60)
    print(f"Kompyuter paneli:  http://localhost:{PORT}/host")
    print(f"Telefon manzili:   http://{LOCAL_IP}:{PORT}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
