// scripts.js - Pomodoro Zen com notificações em tempo real e fallback visual
// Configurações
let focusTime = 10;   // 10 segundos
let breakTime = 5;    // 5 segundos
let currentSeconds = focusTime;
let isFocus = true;
let running = false;
let targetTimestamp = null;
let intervalId = null;
let updateNotificationInterval = null;

// Elementos DOM
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const requestNotifyBtn = document.getElementById('requestNotifyBtn');

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registrado', reg))
        .catch(err => console.log('Erro ao registrar SW:', err));
}

// Envia atualização do tempo restante para o Service Worker (notificação persistente)
function sendTimerUpdate() {
    if (!navigator.serviceWorker.controller) return;
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    const timeLeft = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const phase = isFocus ? '⚡ Foco' : '🌿 Pausa';
    navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_TIMER',
        timeLeft: timeLeft,
        phase: phase,
        isRunning: running
    });
}

// Envia mensagem de fim de ciclo para o Service Worker (notificação de conclusão)
function sendTimerEnd(message) {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'TIMER_END',
            message: message
        });
    }
}

// ========== SONS E VIBRAÇÃO ==========
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.5);
        osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
        console.log("Áudio não suportado");
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ========== FALLBACKS VISUAIS ==========
// Exibe um toast (mensagem temporária flutuante)
function showToast(message) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#2c5f2d';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '40px';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '16px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Tenta enviar notificação push; se falhar, usa alerta comum
function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995572.png' });
    } else {
        alert(`🔔 ${title}: ${body}`);
    }
}

// ========== LÓGICA DO TIMER ==========
function updateDisplay() {
    let mins = Math.floor(currentSeconds / 60);
    let secs = currentSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function switchPhase() {
    if (isFocus) {
        // Foco terminou → pausa curta
        isFocus = false;
        currentSeconds = breakTime;
        phaseText.innerText = "🌿 Pausa curta (5 min)";

        // 1. Notificação push via Service Worker
        sendTimerEnd('🍅 Foco concluído! Hora da pausa de 5 minutos.');
        // 2. Notificação nativa (fallback direto)
        sendNotification('🍅 Pomodoro Zen', 'Foco concluído! Hora da pausa de 5 minutos.');
        // 3. Alerta visual obrigatório (para teste e garantia)
        alert('✅ Foco concluído! Hora da pausa de 5 minutos.');
        // 4. Toast flutuante
        showToast('🍅 Foco concluído! Pausa de 5 min');
    } else {
        // Pausa terminou → volta ao foco
        isFocus = true;
        currentSeconds = focusTime;
        phaseText.innerText = "⚡ Foco (25 min)";

        sendTimerEnd('🌿 Pausa finalizada! Volte a focar por 25 minutos.');
        sendNotification('🌿 Pomodoro Zen', 'Pausa finalizada! Volte a focar por 25 minutos.');
        alert('✅ Pausa finalizada! Volte a focar por 25 minutos.');
        showToast('🌿 Pausa finalizada! Foco de 25 min');
    }

    updateDisplay();
    playBeep();
    sendTimerUpdate(); // atualiza a notificação persistente
}

function tick() {
    if (!running) return;
    const now = Date.now();
    if (targetTimestamp && now >= targetTimestamp) {
        running = false;
        if (intervalId) clearInterval(intervalId);
        if (updateNotificationInterval) clearInterval(updateNotificationInterval);
        switchPhase();
        startTimer();  // reinicia automaticamente a próxima fase
        return;
    }
    if (targetTimestamp) {
        const remaining = Math.max(0, Math.floor((targetTimestamp - now) / 1000));
        if (remaining !== currentSeconds) {
            currentSeconds = remaining;
            updateDisplay();
            if (currentSeconds <= 0) {
                running = false;
                if (intervalId) clearInterval(intervalId);
                if (updateNotificationInterval) clearInterval(updateNotificationInterval);
                switchPhase();
                startTimer();
            }
        }
    }
}

function startTimer() {
    if (running) return;
    running = true;
    targetTimestamp = Date.now() + currentSeconds * 1000;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 200);
    // Atualiza a notificação persistente a cada segundo
    if (updateNotificationInterval) clearInterval(updateNotificationInterval);
    updateNotificationInterval = setInterval(() => {
        if (running) sendTimerUpdate();
    }, 1000);
    sendTimerUpdate();
}

function pauseTimer() {
    if (!running) return;
    running = false;
    if (intervalId) clearInterval(intervalId);
    if (updateNotificationInterval) clearInterval(updateNotificationInterval);
    if (targetTimestamp) {
        currentSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
        updateDisplay();
        targetTimestamp = null;
    }
    sendTimerUpdate(); // mostra "pausado" na notificação
}

function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    if (updateNotificationInterval) clearInterval(updateNotificationInterval);
    targetTimestamp = null;
    isFocus = true;
    currentSeconds = focusTime;
    phaseText.innerText = "⚡ Foco (25 min)";
    updateDisplay();
    sendTimerUpdate();
}

// ========== PERMISSÃO DE NOTIFICAÇÃO ==========
function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') alert('✅ Notificações ativadas!');
            else alert('❌ Permissão negada');
        });
    } else if (Notification.permission === 'granted') {
        alert('✅ Notificações já estão ativadas');
    } else {
        alert('❌ Permissão negada permanentemente. Ative nas configurações do navegador.');
    }
}

// ========== EVENT LISTENERS ==========
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
requestNotifyBtn.addEventListener('click', requestNotificationPermission);

// ========== INICIALIZAÇÃO ==========
updateDisplay();
if (Notification.permission === 'default') Notification.requestPermission();
