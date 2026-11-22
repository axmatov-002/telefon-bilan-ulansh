const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const QRCode = require('qrcode');
const selfsigned = require('selfsigned');

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Process-wide error guards to prevent unexpected exit
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception caught (process preserved):', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection caught (process preserved):', reason);
});
server.on('error', (err) => {
    console.error('⚠️ HTTP Server error:', err.message);
});
wss.on('error', (err) => {
    console.error('⚠️ WSS error:', err.message);
});

// Serve static assets from 'public' (do not auto-serve index.html on root so we can route smartly)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.json());

// Determine local LAN IP address (prefer Wi-Fi / Ethernet IPv4)
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const LOCAL_IP = getLocalIpAddress();
const PHONE_URL = `http://${LOCAL_IP}:${PORT}`;
const PHONE_HTTPS_URL = `https://${LOCAL_IP}:${HTTPS_PORT}`;

// Cache screens list
let cachedScreens = [
    { index: 0, name: '\\\\.\\DISPLAY1', primary: true, x: 0, y: 0, width: 1920, height: 1080 }
];

function refreshScreens() {
    return new Promise((resolve) => {
        const psScript = path.join(__dirname, 'bin', 'get_screens.ps1');
        exec(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, (err, stdout) => {
            if (!err && stdout) {
                try {
                    const parsed = JSON.parse(stdout.trim());
                    cachedScreens = Array.isArray(parsed) ? parsed : [parsed];
                    resolve(cachedScreens);
                    return;
                } catch (e) {
                    console.error('Failed to parse screens JSON:', e);
                }
            }
            resolve(cachedScreens);
        });
    });
}
refreshScreens();

// Initialize Windows Native Input Worker via PowerShell stdin
let inputWorker = null;
function initInputWorker() {
    try {
        const scriptPath = path.join(__dirname, 'bin', 'input_server.ps1');
        inputWorker = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]);

        inputWorker.stdout.on('data', (data) => {
            const out = data.toString().trim();
            if (out.includes('READY')) {
                console.log('⚡ Windows Input Bridge is READY and active.');
            }
        });

        inputWorker.stderr.on('data', (err) => {
            console.error('Input worker stderr:', err.toString());
        });

        if (inputWorker.stdin) {
            inputWorker.stdin.on('error', (err) => {
                console.error('Input worker stdin notice:', err.message);
            });
        }

        inputWorker.on('error', (err) => {
            console.error('Input worker process error:', err.message);
        });

        inputWorker.on('exit', (code) => {
            console.log(`Input worker exited with code ${code}. Restarting...`);
            setTimeout(initInputWorker, 1000);
        });
    } catch (e) {
        console.error('Failed to start Input Worker:', e);
    }
}
initInputWorker();

function sendInputCommand(cmd) {
    try {
        if (inputWorker && inputWorker.stdin && inputWorker.stdin.writable) {
            inputWorker.stdin.write(cmd + '\n');
        }
    } catch (e) {
        console.error('sendInputCommand notice:', e.message);
    }
}

// REST API Endpoints
app.get('/api/info', async (req, res) => {
    await refreshScreens();
    res.json({
        ip: LOCAL_IP,
        port: PORT,
        httpsPort: HTTPS_PORT,
        url: PHONE_URL,
        httpsUrl: PHONE_HTTPS_URL,
        screens: cachedScreens,
        connectedClients: clients.size,
        hasHost: hostSocket !== null && hostSocket.readyState === WebSocket.OPEN
    });
});

app.get('/api/screens', async (req, res) => {
    const screens = await refreshScreens();
    res.json(screens);
});

app.get('/api/qr', async (req, res) => {
    try {
        const qrSvg = await QRCode.toString(PHONE_URL, { type: 'svg', margin: 2 });
        res.type('image/svg+xml').send(qrSvg);
    } catch (e) {
        res.status(500).send('Error generating QR code');
    }
});

// Smart root handler
app.get('/', (req, res) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    const requestedRole = (req.query.role || req.query.view || '').toLowerCase();

    // 1. Explicit query parameter overrides
    if (requestedRole === 'client' || requestedRole === 'phone') {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    if (requestedRole === 'host') {
        return res.sendFile(path.join(__dirname, 'public', 'host.html'));
    }

    // 2. If it's a mobile phone (Android, iPhone, iPad, etc.): ALWAYS show Phone interface!
    if (isMobile) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    // 3. Desktop browser check
    const hostHeader = (req.headers.host || '').toLowerCase();
    const clientIp = req.ip || req.connection.remoteAddress || '';
    const isLocal = hostHeader.includes('localhost') || 
                    hostHeader.includes('127.0.0.1') || 
                    clientIp === '127.0.0.1' || 
                    clientIp === '::1' || 
                    clientIp === '::ffff:127.0.0.1';

    if (isLocal) {
        return res.sendFile(path.join(__dirname, 'public', 'host.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit routes
app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host.html'));
});
app.get('/client', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/phone', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/localhost', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Active WebSocket connections
let hostSocket = null;
const clients = new Map(); // id -> ws

function safeSend(socket, obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(obj));
        } catch (e) {}
    }
}

function handleWebSocketConnection(ws, req) {
    const clientId = Math.random().toString(36).substring(2, 9);
    let role = 'client';
    let selectedScreenIndex = 0;

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Catch any connection-level socket errors to avoid crashing process
    ws.on('error', (err) => {
        console.log(`Socket [${clientId}] notice:`, err.message);
    });

    ws.on('message', (message) => {
        ws.isAlive = true;
        try {
            const data = JSON.parse(message);

            // Role registration
            if (data.type === 'register') {
                role = data.role; // 'host' or 'client'
                if (role === 'host') {
                    hostSocket = ws;
                    console.log('💻 PC Host Control Panel connected.');
                    broadcastToClients({ type: 'host_status', online: true });
                } else {
                    clients.set(clientId, ws);
                    console.log(`📱 Phone Client connected: ID=${clientId}, UserAgent=${data.userAgent || 'Unknown'}`);
                    if (hostSocket) {
                        safeSend(hostSocket, {
                            type: 'client_connected',
                            clientId,
                            userAgent: data.userAgent || 'Phone',
                            time: new Date().toLocaleTimeString()
                        });
                    }
                    safeSend(ws, {
                        type: 'host_status',
                        online: hostSocket !== null && hostSocket.readyState === WebSocket.OPEN,
                        clientId,
                        screens: cachedScreens
                    });
                }
                return;
            }

            // WebRTC Signaling
            if (data.type === 'signal') {
                if (role === 'host') {
                    if (data.targetId && clients.has(data.targetId)) {
                        safeSend(clients.get(data.targetId), {
                            type: 'signal',
                            from: 'host',
                            data: data.data
                        });
                    } else {
                        broadcastToClients({
                            type: 'signal',
                            from: 'host',
                            data: data.data
                        });
                    }
                } else if (role === 'client') {
                    if (hostSocket) {
                        safeSend(hostSocket, {
                            type: 'signal',
                            from: clientId,
                            data: data.data
                        });
                    }
                }
                return;
            }

            // Screen Selection
            if (data.type === 'select_screen') {
                selectedScreenIndex = data.screenIndex || 0;
                return;
            }

            // Stream request from Phone directly
            if (data.type === 'request_stream') {
                if (hostSocket) {
                    safeSend(hostSocket, {
                        type: 'request_stream',
                        from: clientId
                    });
                }
                return;
            }

            // Phone casting status relay
            if (data.type === 'phone_stream_status') {
                if (hostSocket) {
                    safeSend(hostSocket, {
                        type: 'phone_stream_status',
                        from: clientId,
                        status: data.status,
                        streamType: data.streamType
                    });
                }
                return;
            }

            // Touch & Mouse Input
            if (data.type === 'input') {
                handleInputEvent(data, selectedScreenIndex);
                return;
            }

            // Ping/Latency
            if (data.type === 'ping') {
                safeSend(ws, { type: 'pong', clientTime: data.time });
                return;
            }

        } catch (e) {
            console.error('Error handling WebSocket message:', e.message);
        }
    });

    ws.on('close', () => {
        if (role === 'host') {
            console.log('💻 PC Host disconnected.');
            hostSocket = null;
            broadcastToClients({ type: 'host_status', online: false });
        } else {
            console.log(`📱 Phone Client disconnected: ${clientId}`);
            clients.delete(clientId);
            if (hostSocket) {
                safeSend(hostSocket, {
                    type: 'client_disconnected',
                    clientId
                });
            }
        }
    });
}

// Bind to HTTP WebSocket Server
wss.on('connection', handleWebSocketConnection);

function broadcastToClients(msgObj) {
    for (const [id, clientWs] of clients) {
        safeSend(clientWs, msgObj);
    }
}

// Map normalized coordinates (0.0 to 1.0) to actual monitor pixel coordinates
function handleInputEvent(event, screenIndex) {
    const scr = cachedScreens[screenIndex] || cachedScreens[0];
    if (!scr) return;

    switch (event.action) {
        case 'move': {
            const x = Math.round(scr.x + event.x * scr.width);
            const y = Math.round(scr.y + event.y * scr.height);
            sendInputCommand(`MOVE ${x} ${y}`);
            break;
        }
        case 'click': {
            if (event.x !== undefined && event.y !== undefined) {
                const x = Math.round(scr.x + event.x * scr.width);
                const y = Math.round(scr.y + event.y * scr.height);
                sendInputCommand(`MOVE ${x} ${y}`);
            }
            sendInputCommand(`CLICK ${event.button || 'left'}`);
            break;
        }
        case 'down': {
            if (event.x !== undefined && event.y !== undefined) {
                const x = Math.round(scr.x + event.x * scr.width);
                const y = Math.round(scr.y + event.y * scr.height);
                sendInputCommand(`MOVE ${x} ${y}`);
            }
            sendInputCommand(`DOWN ${event.button || 'left'}`);
            break;
        }
        case 'up': {
            sendInputCommand(`UP ${event.button || 'left'}`);
            break;
        }
        case 'scroll': {
            const delta = Math.round(event.deltaY * -1);
            sendInputCommand(`SCROLL ${delta}`);
            break;
        }
        case 'text': {
            if (event.text) {
                const safeText = event.text.replace(/([+^%~{}()[\]])/g, '{$1}');
                sendInputCommand(`TEXT ${safeText}`);
            }
            break;
        }
        case 'key': {
            if (event.key) {
                sendInputCommand(`TEXT ${event.key}`);
            }
            break;
        }
        case 'hotkey': {
            if (event.hotkey) {
                sendInputCommand(`HOTKEY ${event.hotkey}`);
            }
            break;
        }
    }
}

// Safe Heartbeat interval (30s)
setInterval(() => {
    const allSockets = [...wss.clients, ...(httpsWss ? httpsWss.clients : [])];
    allSockets.forEach((ws) => {
        if (ws.isAlive === false) {
            try { ws.terminate(); } catch (e) {}
            return;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch (e) {}
    });
}, 30000);

// Setup HTTPS Server with self-signed certificate for mobile browser security
let httpsServer = null;
let httpsWss = null;

async function startServers() {
    try {
        const pems = await selfsigned.generate([
            { name: 'commonName', value: LOCAL_IP || 'PhoneDisplay' }
        ], {
            days: 365,
            keySize: 2048,
            algorithm: 'sha256',
            extensions: [
                {
                    name: 'subjectAltName',
                    altNames: [
                        { type: 2, value: 'localhost' },
                        { type: 7, ip: LOCAL_IP },
                        { type: 7, ip: '127.0.0.1' }
                    ]
                }
            ]
        });

        httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, app);
        httpsServer.on('error', (err) => {
            console.error('⚠️ HTTPS Server error:', err.message);
        });

        httpsWss = new WebSocket.Server({ server: httpsServer });
        httpsWss.on('error', (err) => {
            console.error('⚠️ HTTPS WSS error:', err.message);
        });
        httpsWss.on('connection', handleWebSocketConnection);

        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`🔒 HTTPS Xavfsiz Manzil (Kamera va Ekran uchun): ${PHONE_HTTPS_URL}`);
        });
    } catch (e) {
        console.log('HTTPS initialize skipped:', e.message);
    }

    // Start HTTP and WebSocket Server
    server.listen(PORT, '0.0.0.0', async () => {
        console.log('\n======================================================');
        console.log('   🚀 PhoneDisplay Pro - Ikkinchi Ekran Dasturi');
        console.log('======================================================');
        console.log(`🌐 Kompyuter Boshqaruv Paneli (Host): http://localhost:${PORT}/host`);
        console.log(`📱 Telefoningizda oching:           ${PHONE_URL}`);
        console.log(`🔒 HTTPS Xavfsiz Manzil:            ${PHONE_HTTPS_URL}`);
        console.log('======================================================\n');

        QRCode.toString(PHONE_URL, { type: 'terminal', small: true }, (err, qr) => {
            if (!err) {
                console.log('📱 Telefon kamerasi bilan quyidagi QR-kodni skanerlang:\n');
                console.log(qr);
            }
        });
    });
}

startServers();
