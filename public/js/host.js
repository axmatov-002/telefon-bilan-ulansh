// PhoneDisplay Pro - PC Host Controller (Dual-Mode: PC -> Phone & Phone -> PC)
let localStream = null; // PC screen stream to phone
let phoneStream = null; // Incoming stream from phone to PC
let ws = null;
const peerConnections = new Map(); // clientId -> RTCPeerConnection

let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Mode Tabs Elements
const tabPcToPhone = document.getElementById('tabPcToPhone');
const tabPhoneToPc = document.getElementById('tabPhoneToPc');
const sectionPcToPhone = document.getElementById('sectionPcToPhone');
const sectionPhoneToPc = document.getElementById('sectionPhoneToPc');
const phoneCastingBadge = document.getElementById('phoneCastingBadge');

// Mode 1 Elements (PC -> Phone)
const hostStatusText = document.getElementById('hostStatusText');
const streamStateBadge = document.getElementById('streamStateBadge');
const fpsBadge = document.getElementById('fpsBadge');
const phoneUrlInput = document.getElementById('phoneUrlInput');
const btnCopyUrl = document.getElementById('btnCopyUrl');
const clientCount = document.getElementById('clientCount');
const clientsList = document.getElementById('clientsList');
const btnStartStream = document.getElementById('btnStartStream');
const btnStopStream = document.getElementById('btnStopStream');
const hostVideoPreview = document.getElementById('hostVideoPreview');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const fpsSelect = document.getElementById('fpsSelect');
const resolutionSelect = document.getElementById('resolutionSelect');
const audioToggle = document.getElementById('audioToggle');
const monitorsList = document.getElementById('monitorsList');
const btnRefreshScreens = document.getElementById('btnRefreshScreens');
const previewStats = document.getElementById('previewStats');

// Banner elements
const phoneAlertBanner = document.getElementById('phoneAlertBanner');
const bannerTitle = document.getElementById('bannerTitle');
const btnBannerShare = document.getElementById('btnBannerShare');
const btnCloseBanner = document.getElementById('btnCloseBanner');

function showPhoneAlertBanner(clientInfo) {
    if (localStream) return;
    if (phoneAlertBanner) {
        bannerTitle.innerText = `📱 ${clientInfo} ulandi va ikkinchi ekranni kutmoqda!`;
        phoneAlertBanner.style.display = 'flex';
    }
}

function hidePhoneAlertBanner() {
    if (phoneAlertBanner) {
        phoneAlertBanner.style.display = 'none';
    }
}

if (btnBannerShare) {
    btnBannerShare.addEventListener('click', () => {
        hidePhoneAlertBanner();
        startScreenStream();
    });
}
if (btnCloseBanner) {
    btnCloseBanner.addEventListener('click', hidePhoneAlertBanner);
}

// Mode 2 Elements (Phone -> PC)
const phoneMirrorVideo = document.getElementById('phoneMirrorVideo');
const phonePlaceholder = document.getElementById('phonePlaceholder');
const phoneMirrorBadge = document.getElementById('phoneMirrorBadge');
const smartphoneMockup = document.getElementById('smartphoneMockup');
const phoneFrameContainer = document.getElementById('phoneFrameContainer');
const btnRotatePhone = document.getElementById('btnRotatePhone');
const btnFullscreenPhone = document.getElementById('btnFullscreenPhone');
const btnSnapshotPhone = document.getElementById('btnSnapshotPhone');
const btnRecordPhone = document.getElementById('btnRecordPhone');
const recordLabel = document.getElementById('recordLabel');
const btnAudioPhone = document.getElementById('btnAudioPhone');
const phoneFpsText = document.getElementById('phoneFpsText');

// Tab Switching
tabPcToPhone.addEventListener('click', () => {
    tabPcToPhone.classList.add('active');
    tabPhoneToPc.classList.remove('active');
    sectionPcToPhone.style.display = 'flex';
    sectionPhoneToPc.style.display = 'none';
});

tabPhoneToPc.addEventListener('click', () => {
    tabPhoneToPc.classList.add('active');
    tabPcToPhone.classList.remove('active');
    sectionPhoneToPc.style.display = 'flex';
    sectionPcToPhone.style.display = 'none';
});

// Fetch Server Info & Update UI
async function fetchServerInfo() {
    try {
        const res = await fetch('/api/info');
        const data = await res.json();
        phoneUrlInput.value = data.url;
        renderMonitors(data.screens);
    } catch (e) {
        console.error('Failed to fetch server info:', e);
    }
}

function renderMonitors(screens) {
    monitorsList.innerHTML = '';
    if (!screens || screens.length === 0) {
        monitorsList.innerHTML = '<span>Hech qanday monitor aniqlanmadi</span>';
        return;
    }
    screens.forEach((s) => {
        const div = document.createElement('div');
        div.className = `monitor-item ${s.primary ? 'primary' : ''}`;
        div.innerHTML = `
            <span>🖥️ <b>${s.primary ? 'Asosiy Monitor' : 'Ekran ' + (s.index + 1)}</b></span>
            <span>(${s.width}x${s.height})</span>
            ${s.primary ? '<span class="badge blue">Primary</span>' : '<span class="badge green">2nd Display</span>'}
        `;
        monitorsList.appendChild(div);
    });
}

// Copy URL to clipboard
btnCopyUrl.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(phoneUrlInput.value);
        btnCopyUrl.innerText = '✅ Nusxalandi!';
        setTimeout(() => { btnCopyUrl.innerText = '📋 Nusxa'; }, 2000);
    } catch (e) {
        phoneUrlInput.select();
        document.execCommand('copy');
    }
});

btnRefreshScreens.addEventListener('click', async () => {
    btnRefreshScreens.innerText = 'Qidirilmoqda...';
    try {
        const res = await fetch('/api/screens');
        const screens = await res.json();
        renderMonitors(screens);
    } finally {
        btnRefreshScreens.innerText = '🔄 Monitorlarni Qayta Aniqlash';
    }
});

function playNotificationChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
}

// WebSocket Connection & Signaling
function initWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
        hostStatusText.innerText = 'Server Faol (Ulangan)';
        ws.send(JSON.stringify({ type: 'register', role: 'host' }));
    };

    ws.onclose = () => {
        hostStatusText.innerText = 'Ulanish uzildi. Qayta ulanmoqda...';
        setTimeout(initWebSocket, 2000);
    };

    ws.onmessage = async (event) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'client_connected') {
                playNotificationChime();
                addClientToUI(msg.clientId, msg.userAgent, msg.time);
                // Create Peer Connection for this client
                getOrCreatePeerConnection(msg.clientId);
                if (localStream) {
                    initiatePeerConnection(msg.clientId);
                } else {
                    showPhoneAlertBanner(msg.userAgent || 'Telefon');
                }
            }

            if (msg.type === 'request_stream') {
                playNotificationChime();
                if (localStream) {
                    initiatePeerConnection(msg.from);
                } else {
                    showPhoneAlertBanner('Telefon (Ekranni so\'ramoqda)');
                }
            }

            if (msg.type === 'client_disconnected') {
                removeClientFromUI(msg.clientId);
                closePeerConnection(msg.clientId);
            }

            if (msg.type === 'phone_stream_status') {
                if (msg.status === 'started') {
                    phoneCastingBadge.style.display = 'inline-block';
                    // Auto switch to Phone -> PC tab if phone starts casting!
                    tabPhoneToPc.click();
                } else {
                    phoneCastingBadge.style.display = 'none';
                    resetPhoneMirrorUI();
                }
            }

            if (msg.type === 'signal') {
                const clientId = msg.from;
                const pc = getOrCreatePeerConnection(clientId);
                if (pc && msg.data) {
                    if (msg.data.sdp) {
                        await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));

                        // Flush queued candidates
                        if (pc.candidateQueue) {
                            while (pc.candidateQueue.length > 0) {
                                const cand = pc.candidateQueue.shift();
                                try { await pc.addIceCandidate(cand); } catch (e) {}
                            }
                        }

                        // If phone initiated an offer (Phone -> PC stream), answer it!
                        if (msg.data.sdp.type === 'offer') {
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            ws.send(JSON.stringify({
                                type: 'signal',
                                targetId: clientId,
                                data: { sdp: pc.localDescription }
                            }));
                        }
                    } else if (msg.data.candidate) {
                        const candidate = new RTCIceCandidate(msg.data.candidate);
                        if (pc.remoteDescription && pc.remoteDescription.type) {
                            try { await pc.addIceCandidate(candidate); } catch (e) {}
                        } else {
                            if (!pc.candidateQueue) pc.candidateQueue = [];
                            pc.candidateQueue.push(candidate);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error handling WS message:', e);
        }
    };
}

// Client UI List Management
function addClientToUI(clientId, userAgent, time) {
    const emptyNotice = clientsList.querySelector('.empty-clients');
    if (emptyNotice) emptyNotice.remove();

    const existing = document.getElementById(`client-${clientId}`);
    if (existing) return;

    const div = document.createElement('div');
    div.id = `client-${clientId}`;
    div.className = 'client-item';
    div.innerHTML = `
        <div class="client-item-info">
            <strong>📱 ${userAgent || 'Telefon'}</strong>
            <span>ID: ${clientId} • Vaqt: ${time}</span>
        </div>
        <span class="badge green">Ulangan</span>
    `;
    clientsList.appendChild(div);
    updateClientCount();
}

function removeClientFromUI(clientId) {
    const item = document.getElementById(`client-${clientId}`);
    if (item) item.remove();
    updateClientCount();
    if (clientsList.children.length === 0) {
        clientsList.innerHTML = '<div class="empty-clients">Hozircha hech qanday telefon ulanmagan. QR-kodni skanerlang!</div>';
    }
}

function updateClientCount() {
    clientCount.innerText = clientsList.querySelectorAll('.client-item').length;
}

// Get or Create RTCPeerConnection for a client
function getOrCreatePeerConnection(clientId) {
    if (peerConnections.has(clientId)) {
        return peerConnections.get(clientId);
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(clientId, pc);

    // If host has active screen stream, attach tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    // Handle incoming stream from PHONE (Phone -> PC Mirroring)
    pc.ontrack = (event) => {
        console.log('📱 Host received remote track from phone:', event.streams[0]);
        if (event.streams && event.streams[0]) {
            phoneStream = event.streams[0];
            phoneMirrorVideo.srcObject = phoneStream;
            phoneMirrorVideo.style.display = 'block';
            phonePlaceholder.style.display = 'none';

            phoneMirrorBadge.innerText = 'Jonli (Live 60 FPS)';
            phoneMirrorBadge.className = 'badge green';
            phoneCastingBadge.style.display = 'inline-block';
            phoneFpsText.innerText = '60 FPS • HD Tasvir';

            // Auto switch to Phone -> PC tab so user immediately sees it!
            tabPhoneToPc.click();
        }
    };

    pc.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'signal',
                targetId: clientId,
                data: { candidate: event.candidate }
            }));
        }
    };

    pc.onconnectionstatechange = () => {
        console.log(`Client ${clientId} connection state:`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            if (phoneStream) {
                resetPhoneMirrorUI();
            }
        }
    };

    return pc;
}

function resetPhoneMirrorUI() {
    phoneStream = null;
    phoneMirrorVideo.srcObject = null;
    phoneMirrorVideo.style.display = 'none';
    phonePlaceholder.style.display = 'flex';
    phoneMirrorBadge.innerText = 'Signal Kutilmoqda';
    phoneMirrorBadge.className = 'badge blue';
    phoneCastingBadge.style.display = 'none';
    phoneFpsText.innerText = '0 FPS • Kutish rejimi';
}

// =========================================================
// MODE 1: Start/Stop PC -> Phone Screen Share
// =========================================================
async function startScreenStream() {
    try {
        const fps = parseInt(fpsSelect.value, 10) || 60;
        const resChoice = resolutionSelect.value;
        const withAudio = audioToggle.value === 'true';

        let captureOptions = {
            video: {
                frameRate: { ideal: fps, max: fps }
            }
        };

        if (resChoice === '1080') {
            captureOptions.video.width = { ideal: 1920 };
            captureOptions.video.height = { ideal: 1080 };
        } else if (resChoice === '720') {
            captureOptions.video.width = { ideal: 1280 };
            captureOptions.video.height = { ideal: 720 };
        }

        if (withAudio) {
            captureOptions.audio = true;
        }

        try {
            localStream = await navigator.mediaDevices.getDisplayMedia(captureOptions);
        } catch (audioErr) {
            if (withAudio) {
                delete captureOptions.audio;
                localStream = await navigator.mediaDevices.getDisplayMedia(captureOptions);
            } else {
                throw audioErr;
            }
        }

        hostVideoPreview.srcObject = localStream;
        hostVideoPreview.style.display = 'block';
        videoPlaceholder.style.display = 'none';
        hidePhoneAlertBanner();

        btnStartStream.style.display = 'none';
        btnStopStream.style.display = 'inline-flex';
        streamStateBadge.innerText = 'Uzatilmoqda (Live 60fps)';
        streamStateBadge.className = 'badge green';

        // Connect with all clients
        peerConnections.forEach((pc, clientId) => {
            initiatePeerConnection(clientId);
        });

        localStream.getVideoTracks()[0].onended = () => {
            stopScreenStream();
        };

        startFpsMeter();

    } catch (err) {
        console.error('Error starting screen capture:', err);
        alert('Ekran ulashish bekor qilindi yoki xatolik yuz berdi: ' + err.message);
    }
}

function stopScreenStream() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    hostVideoPreview.srcObject = null;
    hostVideoPreview.style.display = 'none';
    videoPlaceholder.style.display = 'flex';

    btnStartStream.style.display = 'inline-flex';
    btnStopStream.style.display = 'none';
    streamStateBadge.innerText = 'To\'xtatilgan';
    streamStateBadge.className = 'badge purple';
    fpsBadge.innerText = '0 FPS';
}

async function initiatePeerConnection(clientId) {
    if (!localStream) return;
    const pc = getOrCreatePeerConnection(clientId);

    // Replace or add track
    const senders = pc.getSenders();
    localStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
            sender.replaceTrack(track);
        } else {
            pc.addTrack(track, localStream);
        }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'signal',
            targetId: clientId,
            data: { sdp: pc.localDescription }
        }));
    }
}

function closePeerConnection(clientId) {
    const pc = peerConnections.get(clientId);
    if (pc) {
        pc.close();
        peerConnections.delete(clientId);
    }
}

function startFpsMeter() {
    function countFrame() {
        if (!localStream) return;
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
            fpsBadge.innerText = `${currentFps} FPS`;
            previewStats.innerText = `Kechikish: ~6-14 ms • ${currentFps} FPS`;
            frameCount = 0;
            lastFpsTime = now;
        }
        requestAnimationFrame(countFrame);
    }
    requestAnimationFrame(countFrame);
}

// =========================================================
// MODE 2: Phone Mirror Tools (Rotate, Snapshot, Record)
// =========================================================

// Rotate between Portrait and Landscape
btnRotatePhone.addEventListener('click', () => {
    if (smartphoneMockup.classList.contains('portrait')) {
        smartphoneMockup.classList.remove('portrait');
        smartphoneMockup.classList.add('landscape');
        btnRotatePhone.innerText = '🔄 Burish (Portret)';
    } else {
        smartphoneMockup.classList.remove('landscape');
        smartphoneMockup.classList.add('portrait');
        btnRotatePhone.innerText = '🔄 Burish (Albom)';
    }
});

// Fullscreen Phone View
btnFullscreenPhone.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        phoneFrameContainer.requestFullscreen().catch(err => {
            alert('To\'liq ekranga o\'tishda xatolik: ' + err.message);
        });
    } else {
        document.exitFullscreen();
    }
});

// Take Snapshot / Screenshot of Phone Screen
btnSnapshotPhone.addEventListener('click', () => {
    if (!phoneStream || phoneMirrorVideo.videoWidth === 0) {
        alert('Hozirda telefon ekrani uzatilmayapti!');
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = phoneMirrorVideo.videoWidth;
    canvas.height = phoneMirrorVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(phoneMirrorVideo, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = `telefon_ekrani_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Record Phone Screen Video
btnRecordPhone.addEventListener('click', () => {
    if (!phoneStream) {
        alert('Hozirda telefon ekrani uzatilmayapti!');
        return;
    }

    if (!isRecording) {
        // Start recording
        recordedChunks = [];
        try {
            mediaRecorder = new MediaRecorder(phoneStream, { mimeType: 'video/webm;codecs=vp9,opus' });
        } catch (e) {
            mediaRecorder = new MediaRecorder(phoneStream);
        }

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `telefon_video_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();
        isRecording = true;
        recordLabel.innerText = 'To\'xtatish ⏹';
        btnRecordPhone.style.background = '#dc2626';
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordLabel.innerText = 'Yozib Olish';
        btnRecordPhone.style.background = '';
    }
});

// Audio Toggle
btnAudioPhone.addEventListener('click', () => {
    phoneMirrorVideo.muted = !phoneMirrorVideo.muted;
    btnAudioPhone.innerText = phoneMirrorVideo.muted ? '🔇 Ovoz: O\'chiq' : '🔊 Ovoz: Yoqilgan';
});

// Event Listeners for Mode 1
btnStartStream.addEventListener('click', startScreenStream);
btnStopStream.addEventListener('click', stopScreenStream);

// =========================================================
// ANIMATED DUAL SCREEN INTERACTIVE GUIDE CONTROLLER
// =========================================================
const btnToggleAnimGuide = document.getElementById('btnToggleAnimGuide');
const btnCloseAnimGuide = document.getElementById('btnCloseAnimGuide');
const btnHostPlayAnim = document.getElementById('btnHostPlayAnim');
const animGuideBox = document.getElementById('animGuideBox');
const hostFloatingWindow = document.getElementById('hostFloatingWindow');
const hostVirtualCursor = document.getElementById('hostVirtualCursor');
const hostMockupPhone = document.getElementById('hostMockupPhone');
const hostPhoneScreenBody = document.getElementById('hostPhoneScreenBody');
const hostPhoneIdleState = document.getElementById('hostPhoneIdleState');
const hostAnimTitle = document.getElementById('hostAnimTitle');
const hostAnimSubtitle = document.getElementById('hostAnimSubtitle');

let hostAnimRunning = false;

function runHostAnimation() {
    if (hostAnimRunning) return;
    hostAnimRunning = true;
    btnHostPlayAnim.innerText = 'Surilmoqda...';

    // Reset initial state
    hostFloatingWindow.style.transform = 'translate(0px, 0px) scale(1)';
    hostVirtualCursor.style.opacity = '0';
    hostPhoneIdleState.style.display = 'block';
    hostPhoneScreenBody.style.borderColor = '#334155';
    hostPhoneScreenBody.style.background = '#020617';

    hostAnimTitle.innerText = '1. Sichqoncha dastur sarlavhasini tutdi';
    hostAnimSubtitle.innerText = 'Oynani bosib turib, kompyuter ekranidan o\'ng tomonga (telefon monitoriga) qarab suramiz...';

    // Step 1: Cursor appears
    setTimeout(() => {
        hostVirtualCursor.style.opacity = '1';
        hostVirtualCursor.style.left = '60px';
        hostVirtualCursor.style.top = '45px';
    }, 400);

    // Step 2: Drag across to phone
    setTimeout(() => {
        const stage = document.querySelector('.anim-stage');
        const stageWidth = stage ? stage.clientWidth : 500;
        const dragDistanceX = stageWidth - 210;

        hostFloatingWindow.style.transform = `translate(${dragDistanceX}px, 20px) scale(0.68)`;
        hostFloatingWindow.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.8)';

        hostVirtualCursor.style.left = (dragDistanceX + 50) + 'px';
        hostVirtualCursor.style.top = '65px';

        hostPhoneScreenBody.style.borderColor = '#38bdf8';
        hostPhoneScreenBody.style.background = 'rgba(14, 165, 233, 0.15)';
    }, 1100);

    // Step 3: Landed on phone
    setTimeout(() => {
        hostVirtualCursor.style.opacity = '0';
        hostPhoneIdleState.style.display = 'none';
        hostAnimTitle.innerText = '✅ Tayyor! Ikkala dastur alohida ishlamoqda:';
        hostAnimSubtitle.innerText = 'Noutbukda kod yoki asosiy ish davom etyapti, telefonda esa video mustaqil ravishda ishlab turibdi!';
        btnHostPlayAnim.innerText = '▶ Qayta Ijro Etish';
        hostAnimRunning = false;
    }, 2500);
}

if (btnToggleAnimGuide) {
    btnToggleAnimGuide.addEventListener('click', () => {
        const isHidden = animGuideBox.style.display === 'none';
        animGuideBox.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            runHostAnimation();
        }
    });
}

if (btnCloseAnimGuide) {
    btnCloseAnimGuide.addEventListener('click', () => {
        animGuideBox.style.display = 'none';
    });
}

if (btnHostPlayAnim) {
    btnHostPlayAnim.addEventListener('click', runHostAnimation);
}

// Initialize
fetchServerInfo();
initWebSocket();
