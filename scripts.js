// Configurações
let focusTime = 25 * 60;    // 25 minutos em segundos
let breakTime = 5 * 60;     // 5 minutos
let currentSeconds = focusTime;
let isFocus = true;
let running = false;
let targetTimestamp = null;
let intervalId = null;

// Elementos DOM
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const requestNotifyBtn = document.getElementById('requestNotifyBtn');

// Função para tocar beep
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        gain.gain.value = 0.3;
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1.5);
        oscillator.stop(audioCtx.currentTime + 1.5);
    } catch(e) { console.log("Áudio não suportado"); }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// Envia notificação (push ou alert fallback)
function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995572.png' });
    } else {
        alert(`🔔 ${title}: ${body}`);
    }
}

// Alterna entre foco e pausa
function switchPhase() {
    if (isFocus) {
        isFocus = false;
        currentSeconds = breakTime;
        phaseText.innerText = "🌿 Pausa curta (5 min)";
        sendNotification('🍅 Pomodoro Zen', 'Foco concluído! Hora da pausa de 5 minutos.');
    } else {
        isFocus = true;
        currentSeconds = focusTime;
        phaseText.innerText = "⚡ Foco (25 min)";
        sendNotification('🌿 Pomodoro Zen', 'Pausa finalizada! Volte a focar por 25 minutos.');
    }
    updateDisplay();
    playBeep();
}

// Atualiza o display do timer
function updateDisplay() {
    let mins = Math.floor(currentSeconds / 60);
    let secs = currentSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

// Tick do timer (baseado em timestamp para funcionar com tela desligada)
function tick() {
    if (!running) return;
    const now = Date.now();
    if (targetTimestamp && now >= targetTimestamp) {
        running = false;
        if (intervalId) clearInterval(intervalId);
        switchPhase();
        startTimer();
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
                switchPhase();
                startTimer();
            }
        }
    }
}

// Inicia o timer
function startTimer() {
    if (running) return;
    running = true;
    targetTimestamp = Date.now() + currentSeconds * 1000;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 200);
}

// Pausa o timer
function pauseTimer() {
    if (!running) return;
    running = false;
    if (intervalId) clearInterval(intervalId);
    if (targetTimestamp) {
        currentSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
        updateDisplay();
        targetTimestamp = null;
    }
}

// Reseta o timer
function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    targetTimestamp = null;
    isFocus = true;
    currentSeconds = focusTime;
    phaseText.innerText = "⚡ Foco (25 min)";
    updateDisplay();
}

// Solicita permissão para notificações
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

// Event listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
requestNotifyBtn.addEventListener('click', requestNotificationPermission);

// Inicialização
updateDisplay();
// Solicita permissão automaticamente se ainda não foi definida
if (Notification.permission === 'default') {
    Notification.requestPermission();
}
