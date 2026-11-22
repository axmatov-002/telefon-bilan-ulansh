// PhoneDisplay Pro - Phone Receiver & Controller (Dual-Mode: Second Display + Remote Control)
let ws = null;
let peerConnection = null;
let wakeLock = null;
let phoneCastingStream = null;

let isTouchpadMode = false; // false = Direct Touch, true = Virtual Cursor
let fitModes = ['fit-contain', 'fit-cover', 'fit-stretch'];
let currentFitIndex = 0;
let lastPingTime = 0;
let currentPing = 0;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Mode Switcher Elements
const btnModePcToPhone = document.getElementById('btnModePcToPhone');
const btnModeRemote = document.getElementById('btnModeRemote');
const btnModePhoneToPc = document.getElementById('btnModePhoneToPc');
const viewPcToPhone = document.getElementById('viewPcToPhone');
const viewRemote = document.getElementById('viewRemote');
const viewPhoneToPc = document.getElementById('viewPhoneToPc');

// Mode 1: PC -> Phone Elements
const videoContainer = document.getElementById('videoContainer');
const remoteVideo = document.getElementById('remoteVideo');
const touchOverlay = document.getElementById('touchOverlay');
const virtualCursor = document.getElementById('virtualCursor');
const waitingScreen = document.getElementById('waitingScreen');
const connectionStatusText = document.getElementById('connectionStatusText');
const connectionBadgeText = document.getElementById('connectionBadgeText');
const connectionStateText = document.getElementById('connectionStateText');
const pingBadge = document.getElementById('pingBadge');
const liveStatsBadge = document.getElementById('liveStatsBadge');
const btnRequestScreenFromPC = document.getElementById('btnRequestScreenFromPC');

// Waiting Touchpad & Hotkeys Elements
const waitingTouchpad = document.getElementById('waitingTouchpad');
const btnWaitLeftClick = document.getElementById('btnWaitLeftClick');
const btnWaitRightClick = document.getElementById('btnWaitRightClick');
const btnWaitKeyboard = document.getElementById('btnWaitKeyboard');

// Toolbar Elements
const btnToggleMenu = document.getElementById('btnToggleMenu');
const controlsToolbar = document.getElementById('controlsToolbar');
const btnCloseToolbar = document.getElementById('btnCloseToolbar');
const btnFullscreen = document.getElementById('btnFullscreen');
const btnOpenKeyboard = document.getElementById('btnOpenKeyboard');
const btnToggleTouchMode = document.getElementById('btnToggleTouchMode');
const touchModeLabel = document.getElementById('touchModeLabel');
const btnFitMode = document.getElementById('btnFitMode');
const fitModeLabel = document.getElementById('fitModeLabel');
const hiddenKeyboardInput = document.getElementById('hiddenKeyboardInput');

// Mode 2: Dedicated Remote Elements
const dedicatedTrackpad = document.getElementById('dedicatedTrackpad');
const remoteSensitivitySelect = document.getElementById('remoteSensitivitySelect');
const btnDedicatedLeftClick = document.getElementById('btnDedicatedLeftClick');
const btnDedicatedRightClick = document.getElementById('btnDedicatedRightClick');
const pcTextInput = document.getElementById('pcTextInput');
const btnSendTextToPc = document.getElementById('btnSendTextToPc');

// Mode 3: Phone -> PC Elements
const btnStartPhoneScreenShare = document.getElementById('btnStartPhoneScreenShare');
const btnStartPhoneCameraShare = document.getElementById('btnStartPhoneCameraShare');
const btnStopPhoneShare = document.getElementById('btnStopPhoneShare');
const castIndicator = document.getElementById('castIndicator');
const castStatusText = document.getElementById('castStatusText');
const castPreviewWrapper = document.getElementById('castPreviewWrapper');
const phoneLocalPreviewVideo = document.getElementById('phoneLocalPreviewVideo');

// =========================================================
// TAB SWITCHING
// =========================================================
function switchTab(activeBtn, activeView) {
    [btnModePcToPhone, btnModeRemote, btnModePhoneToPc].forEach(b => b.classList.remove('active'));
    [viewPcToPhone, viewRemote, viewPhoneToPc].forEach(v => v.style.display = 'none');

    activeBtn.classList.add('active');
    activeView.style.display = 'flex';
}

btnModePcToPhone.addEventListener('click', () => switchTab(btnModePcToPhone, viewPcToPhone));
btnModeRemote.addEventListener('click', () => switchTab(btnModeRemote, viewRemote));
btnModePhoneToPc.addEventListener('click', () => switchTab(btnModePhoneToPc, viewPhoneToPc));

// Direct Screen Request to PC
btnRequestScreenFromPC.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'request_stream' }));
        btnRequestScreenFromPC.innerHTML = '<span>✅ So\'rov Yuborildi!</span>';
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(() => {
            btnRequestScreenFromPC.innerHTML = '<span class="icon">🔔</span> Kompyuterdan Ekranni Olish';
        }, 3000);
    }
});

let candidateQueue = [];

// =========================================================
// WEBSOCKET & WEBRTC SIGNALING
// =========================================================
function initWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
        if (connectionBadgeText) connectionBadgeText.innerText = "Kompyuterga Bevosita Bog'landi";
        if (connectionStateText) connectionStateText.innerText = "Faol";
        if (connectionStatusText) connectionStatusText.innerText = "Kompyuterdan ekran tanlang yoki 'Ekranni Olish' tugmasini bosing.";

        ws.send(JSON.stringify({
            type: 'register',
            role: 'client',
            userAgent: navigator.userAgent
        }));
        startPingTimer();
    };

    ws.onclose = () => {
        if (connectionBadgeText) connectionBadgeText.innerText = "Aloqa Uzildi";
        if (connectionStateText) connectionStateText.innerText = "Qayta ulanmoqda...";
        if (connectionStatusText) connectionStatusText.innerText = "Kompyuter bilan qayta bog'lanilmoqda...";
        
        waitingScreen.style.display = 'flex';
        waitingScreen.style.opacity = '1';

        candidateQueue = [];
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        setTimeout(initWebSocket, 2000);
    };

    ws.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'host_status') {
                if (msg.online) {
                    if (connectionStatusText) connectionStatusText.innerText = "Kompyuter faol. Ekran oqimi boshlanishi bilan bu yerda paydo bo'ladi.";
                } else {
                    if (connectionStatusText) connectionStatusText.innerText = "Kompyuter boshqaruv paneli hali ochilmagan.";
                }
            }

            if (msg.type === 'signal') {
                if (!peerConnection) {
                    createPeerConnection();
                }

                if (msg.data.sdp) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));

                    // Flush queued ICE candidates
                    while (candidateQueue.length > 0) {
                        const cand = candidateQueue.shift();
                        try {
                            await peerConnection.addIceCandidate(cand);
                        } catch (ce) {
                            console.log('Candidate flush error:', ce);
                        }
                    }

                    if (msg.data.sdp.type === 'offer') {
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        ws.send(JSON.stringify({
                            type: 'signal',
                            data: { sdp: peerConnection.localDescription }
                        }));
                    }
                } else if (msg.data.candidate) {
                    const candidateObj = new RTCIceCandidate(msg.data.candidate);
                    if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                        try {
                            await peerConnection.addIceCandidate(candidateObj);
                        } catch (ce) {
                            console.log('Add candidate error:', ce);
                        }
                    } else {
                        candidateQueue.push(candidateObj);
                    }
                }
            }

            if (msg.type === 'pong') {
                const now = performance.now();
                currentPing = Math.round(now - lastPingTime);
                if (pingBadge) pingBadge.innerText = `Ping: ${currentPing} ms`;
                if (liveStatsBadge) liveStatsBadge.innerText = `60 FPS • ${currentPing}ms`;
            }
        } catch (e) {
            console.error('Error handling WebSocket message:', e);
        }
    };
}

function createPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(rtcConfig);

    // Incoming track from PC (PC -> Phone)
    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.muted = true;
            remoteVideo.playsInline = true;
            const playPromise = remoteVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.log('Autoplay handled:', e));
            }

            waitingScreen.style.opacity = '0';
            setTimeout(() => {
                waitingScreen.style.display = 'none';
            }, 300);

            requestWakeLock();
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'signal',
                data: { candidate: event.candidate }
            }));
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('PeerConnection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            waitingScreen.style.display = 'flex';
            waitingScreen.style.opacity = '1';
            if (connectionStatusText) connectionStatusText.innerText = "Video uzatish to'xtatildi. Qayta ulanmoqda...";
        }
    };

    // If phone is casting, attach local phone stream to PC
    if (phoneCastingStream) {
        phoneCastingStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, phoneCastingStream);
        });
    }

    return peerConnection;
}

// Ping measurement
function startPingTimer() {
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            lastPingTime = performance.now();
            ws.send(JSON.stringify({ type: 'ping', time: lastPingTime }));
        }
    }, 2000);
}

// Screen Wake Lock API
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) {
        console.log('WakeLock not supported or denied:', e);
    }
}

// Helper: send input event to server
function sendInputEvent(eventObj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'input',
            ...eventObj
        }));
    }
}

// =========================================================
// WAITING CARD TOUCHPAD & HOTKEYS
// =========================================================
let waitTouchX = 0;
let waitTouchY = 0;
let waitTouchMoved = false;

if (waitingTouchpad) {
    waitingTouchpad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        waitTouchX = t.clientX;
        waitTouchY = t.clientY;
        waitTouchMoved = false;
    }, { passive: false });

    waitingTouchpad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - waitTouchX;
        const dy = t.clientY - waitTouchY;

        if (Math.hypot(dx, dy) > 2) {
            waitTouchMoved = true;
            // Scale and map delta to mouse move
            normCursorX = Math.max(0, Math.min(1, normCursorX + (dx / 300)));
            normCursorY = Math.max(0, Math.min(1, normCursorY + (dy / 300)));
            sendInputEvent({ action: 'move', x: normCursorX, y: normCursorY });
            waitTouchX = t.clientX;
            waitTouchY = t.clientY;
        }
    }, { passive: false });

    waitingTouchpad.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!waitTouchMoved) {
            sendInputEvent({ action: 'click', button: 'left', x: normCursorX, y: normCursorY });
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }, { passive: false });
}

if (btnWaitLeftClick) {
    btnWaitLeftClick.addEventListener('click', () => {
        sendInputEvent({ action: 'click', button: 'left' });
        if (navigator.vibrate) navigator.vibrate(30);
    });
}
if (btnWaitRightClick) {
    btnWaitRightClick.addEventListener('click', () => {
        sendInputEvent({ action: 'click', button: 'right' });
        if (navigator.vibrate) navigator.vibrate(40);
    });
}
if (btnWaitKeyboard) {
    btnWaitKeyboard.addEventListener('click', () => {
        hiddenKeyboardInput.value = '';
        hiddenKeyboardInput.focus();
    });
}

// Hotkey buttons handler (works for any element with data-hotkey)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hotkey]');
    if (btn) {
        const hotkey = btn.getAttribute('data-hotkey');
        if (hotkey) {
            sendInputEvent({ action: 'hotkey', hotkey });
            if (navigator.vibrate) navigator.vibrate(40);
        }
    }
});

// =========================================================
// VIEW 2: DEDICATED REMOTE TRACKPAD & CONTROLS
// =========================================================
let dedTouchX = 0;
let dedTouchY = 0;
let dedTouchMoved = false;
let dedTouchStartTime = 0;
let normCursorX = 0.5;
let normCursorY = 0.5;

if (dedicatedTrackpad) {
    dedicatedTrackpad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        dedTouchX = t.clientX;
        dedTouchY = t.clientY;
        dedTouchMoved = false;
        dedTouchStartTime = performance.now();
    }, { passive: false });

    dedicatedTrackpad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const sens = parseFloat(remoteSensitivitySelect ? remoteSensitivitySelect.value : 1.5) || 1.5;

        if (e.touches.length === 1) {
            const t = e.touches[0];
            const dx = (t.clientX - dedTouchX) * sens;
            const dy = (t.clientY - dedTouchY) * sens;

            if (Math.hypot(dx, dy) > 2) {
                dedTouchMoved = true;
                normCursorX = Math.max(0, Math.min(1, normCursorX + (dx / 400)));
                normCursorY = Math.max(0, Math.min(1, normCursorY + (dy / 400)));
                sendInputEvent({ action: 'move', x: normCursorX, y: normCursorY });
                dedTouchX = t.clientX;
                dedTouchY = t.clientY;
            }
        } else if (e.touches.length === 2) {
            // 2-finger scroll
            const deltaY = e.touches[0].clientY - dedTouchY;
            if (Math.abs(deltaY) > 4) {
                sendInputEvent({ action: 'scroll', deltaY: deltaY * 2 });
                dedTouchY = e.touches[0].clientY;
            }
        }
    }, { passive: false });

    dedicatedTrackpad.addEventListener('touchend', (e) => {
        e.preventDefault();
        const dur = performance.now() - dedTouchStartTime;
        if (!dedTouchMoved && dur < 300) {
            sendInputEvent({ action: 'click', button: 'left', x: normCursorX, y: normCursorY });
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }, { passive: false });
}

if (btnDedicatedLeftClick) {
    btnDedicatedLeftClick.addEventListener('click', () => {
        sendInputEvent({ action: 'click', button: 'left' });
        if (navigator.vibrate) navigator.vibrate(30);
    });
}
if (btnDedicatedRightClick) {
    btnDedicatedRightClick.addEventListener('click', () => {
        sendInputEvent({ action: 'click', button: 'right' });
        if (navigator.vibrate) navigator.vibrate(40);
    });
}

// Text Sender
if (btnSendTextToPc && pcTextInput) {
    const handleSendText = () => {
        const text = pcTextInput.value;
        if (text && text.trim().length > 0) {
            sendInputEvent({ action: 'text', text });
            pcTextInput.value = '';
            if (navigator.vibrate) navigator.vibrate(30);
        }
    };
    btnSendTextToPc.addEventListener('click', handleSendText);
    pcTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSendText();
    });
}

// =========================================================
// MODE 3: PHONE -> PC SCREEN & CAMERA CASTING
// =========================================================
async function startPhoneScreenCasting() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                const switchHttps = confirm(
                    "Diqqat: Mobil brauzerlarda ekran uzatish xavfsiz HTTPS protokolini talab qiladi.\n\n" +
                    "1. Agar kompyuter ekranini telefonda ko'rmoqchi (2-ekran qilmoqchi) bo'lsangiz — tepada chapdagi '🖥️ 2-Ekran (PC ➔ Tel)' tugmasini bosing!\n\n" +
                    "2. Telefoningiz ekranini kompyuterga uzatish uchun xavfsiz HTTPS manziliga o'tishni xohlaysizmi?"
                );
                if (switchHttps) {
                    location.href = `https://${location.hostname}:3443`;
                }
                return;
            }
            alert('Kechirasiz, ushbu mobil brauzerda ekran uzatish qo\'llab-quvvatlanmaydi. Iltimos, Android Google Chrome brauzeridan foydalaning.');
            return;
        }

        phoneCastingStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 60, max: 60 } },
            audio: true
        });

        setupCastingStream(phoneCastingStream, 'screen');
    } catch (err) {
        console.error('Error starting phone screen cast:', err);
    }
}

async function startPhoneCameraCasting() {
    try {
        phoneCastingStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true
        });

        setupCastingStream(phoneCastingStream, 'camera');
    } catch (err) {
        console.error('Error starting camera stream:', err);
        alert('Kameraga ulanishda xatolik: ' + err.message);
    }
}

async function setupCastingStream(stream, streamType) {
    phoneLocalPreviewVideo.srcObject = stream;
    castPreviewWrapper.style.display = 'flex';

    btnStartPhoneScreenShare.style.display = 'none';
    btnStartPhoneCameraShare.style.display = 'none';
    btnStopPhoneShare.style.display = 'inline-flex';

    castIndicator.className = 'status-indicator-dot active';
    castStatusText.innerText = streamType === 'screen' ? '🟢 Telefon Ekrani Kompyuterga Uzatilmoqda...' : '🟢 Kamera Kompyuterga Uzatilmoqda...';

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'phone_stream_status',
            status: 'started',
            streamType: streamType
        }));
    }

    if (!peerConnection) {
        createPeerConnection();
    }

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'signal',
            data: { sdp: peerConnection.localDescription }
        }));
    }

    stream.getVideoTracks()[0].onended = () => {
        stopPhoneCasting();
    };

    requestWakeLock();
}

function stopPhoneCasting() {
    if (phoneCastingStream) {
        phoneCastingStream.getTracks().forEach(t => t.stop());
        phoneCastingStream = null;
    }

    phoneLocalPreviewVideo.srcObject = null;
    castPreviewWrapper.style.display = 'none';

    btnStartPhoneScreenShare.style.display = 'inline-flex';
    btnStartPhoneCameraShare.style.display = 'inline-flex';
    btnStopPhoneShare.style.display = 'none';

    castIndicator.className = 'status-indicator-dot idle';
    castStatusText.innerText = 'Uzatish to\'xtatilgan';

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'phone_stream_status',
            status: 'stopped'
        }));
    }
}

btnStartPhoneScreenShare.addEventListener('click', startPhoneScreenCasting);
btnStartPhoneCameraShare.addEventListener('click', startPhoneCameraCasting);
btnStopPhoneShare.addEventListener('click', stopPhoneCasting);

// =========================================================
// VIEW 1 CONTROLS & TOUCH ENGINE (PC -> Phone Screen)
// =========================================================
btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen error:', err);
        });
    } else {
        document.exitFullscreen();
    }
    closeToolbar();
});

btnFitMode.addEventListener('click', () => {
    videoContainer.classList.remove(...fitModes);
    currentFitIndex = (currentFitIndex + 1) % fitModes.length;
    const newMode = fitModes[currentFitIndex];
    videoContainer.classList.add(newMode);

    const labels = ['Fit: Contain', 'Fit: Cover', 'Fit: Stretch'];
    fitModeLabel.innerText = labels[currentFitIndex];
});

btnToggleTouchMode.addEventListener('click', () => {
    isTouchpadMode = !isTouchpadMode;
    touchModeLabel.innerText = isTouchpadMode ? 'Trekpad (Mouse)' : 'Sensor (Direct)';
    virtualCursor.style.display = isTouchpadMode ? 'block' : 'none';
    btnToggleTouchMode.querySelector('.icon').innerText = isTouchpadMode ? '🖱️' : '👆';
});

btnOpenKeyboard.addEventListener('click', () => {
    hiddenKeyboardInput.value = '';
    hiddenKeyboardInput.focus();
    closeToolbar();
});

hiddenKeyboardInput.addEventListener('input', () => {
    const text = hiddenKeyboardInput.value;
    if (text.length > 0) {
        sendInputEvent({ action: 'text', text });
        hiddenKeyboardInput.value = '';
    }
});

hiddenKeyboardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        sendInputEvent({ action: 'key', key: '{BS}' });
    } else if (e.key === 'Enter') {
        sendInputEvent({ action: 'key', key: '{ENTER}' });
    }
});

document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key) {
            sendInputEvent({ action: 'key', key });
        }
    });
});

btnToggleMenu.addEventListener('click', () => {
    controlsToolbar.classList.toggle('collapsed');
});
btnCloseToolbar.addEventListener('click', closeToolbar);
function closeToolbar() {
    controlsToolbar.classList.add('collapsed');
}

// Touch Gestures on Video Stream
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isDragging = false;
let longPressTimer = null;
let lastTapTime = 0;
let virtualCursorX = window.innerWidth / 2;
let virtualCursorY = window.innerHeight / 2;

function getNormalizedCoords(clientX, clientY) {
    const rect = remoteVideo.getBoundingClientRect();
    let clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
    let clampedY = Math.max(rect.top, Math.min(clientY, rect.bottom));

    const normX = (clampedX - rect.left) / rect.width;
    const normY = (clampedY - rect.top) / rect.height;

    return {
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY))
    };
}

touchOverlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = performance.now();
    isDragging = false;

    if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        const coords = getNormalizedCoords(touchStartX, touchStartY);
        sendInputEvent({ action: 'click', button: 'right', x: coords.x, y: coords.y });
        return;
    }

    longPressTimer = setTimeout(() => {
        if (!isDragging && e.touches.length === 1) {
            const coords = getNormalizedCoords(touchStartX, touchStartY);
            sendInputEvent({ action: 'click', button: 'right', x: coords.x, y: coords.y });
            if (navigator.vibrate) navigator.vibrate(50);
        }
    }, 450);
}, { passive: false });

touchOverlay.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);

        if (dist > 8) {
            isDragging = true;
            clearTimeout(longPressTimer);

            if (isTouchpadMode) {
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                virtualCursorX = Math.max(0, Math.min(window.innerWidth, virtualCursorX + deltaX));
                virtualCursorY = Math.max(0, Math.min(window.innerHeight, virtualCursorY + deltaY));
                virtualCursor.style.left = `${virtualCursorX}px`;
                virtualCursor.style.top = `${virtualCursorY}px`;

                touchStartX = touch.clientX;
                touchStartY = touch.clientY;

                const coords = getNormalizedCoords(virtualCursorX, virtualCursorY);
                sendInputEvent({ action: 'move', x: coords.x, y: coords.y });
            } else {
                const coords = getNormalizedCoords(touch.clientX, touch.clientY);
                sendInputEvent({ action: 'move', x: coords.x, y: coords.y });
            }
        }
    } else if (e.touches.length === 2) {
        clearTimeout(longPressTimer);
        const deltaY = e.touches[0].clientY - touchStartY;
        if (Math.abs(deltaY) > 5) {
            sendInputEvent({ action: 'scroll', deltaY: deltaY * 2 });
            touchStartY = e.touches[0].clientY;
        }
    }
}, { passive: false });

touchOverlay.addEventListener('touchend', (e) => {
    e.preventDefault();
    clearTimeout(longPressTimer);

    const now = performance.now();
    const duration = now - touchStartTime;

    if (!isDragging && duration < 350 && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        let coords = isTouchpadMode ? getNormalizedCoords(virtualCursorX, virtualCursorY) : getNormalizedCoords(touch.clientX, touch.clientY);

        if (now - lastTapTime < 280) {
            sendInputEvent({ action: 'click', button: 'left', x: coords.x, y: coords.y });
            setTimeout(() => {
                sendInputEvent({ action: 'click', button: 'left', x: coords.x, y: coords.y });
            }, 60);
            lastTapTime = 0;
        } else {
            sendInputEvent({ action: 'click', button: 'left', x: coords.x, y: coords.y });
            lastTapTime = now;
        }
    } else if (isDragging) {
        sendInputEvent({ action: 'up', button: 'left' });
    }
}, { passive: false });

// Initialize
initWebSocket();
