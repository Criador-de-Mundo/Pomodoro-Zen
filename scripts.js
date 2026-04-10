// scripts.js - Pomodoro Zen com timer confiável e notificações
// Configurações (para teste, use 10 segundos; depois volte para 25*60)
let focusTime = 10;        // 10 segundos (teste)
let breakTime = 5;         // 5 segundos
let currentSeconds = focusTime;
let isFocus = true;
let running = false;
let intervalId = null;

// Elementos DOM
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const requestNotifyBtn = document.getElementById('requestNotifyBtn');

// Service Worker (se existir)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('SW erro:', err));
}

// Funções auxiliares
function updateDisplay() {
    let mins = Math.floor(currentSeconds / 60);
    let secs = currentSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

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
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        osc.stop(audioCtx.currentTime + 1);
    } catch(e) { console.log("Áudio não suportado"); }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

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
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995572.png' });
    } else {
        console.log("Notificação não permitida");
    }
}

function switchPhase() {
    if (isFocus) {
        // Foco terminou -> pausa
        isFocus = false;
        currentSeconds = breakTime;
        phaseText.innerText = "🌿 Pausa curta (5 min)";
        const msg = '🍅 Foco concluído! Hora da pausa de 5 minutos.';
        sendNotification('Pomodoro Zen', msg);
        alert(msg);      // Alerta garantido
        showToast(msg);
    } else {
        // Pausa terminou -> foco
        isFocus = true;
        currentSeconds = focusTime;
        phaseText.innerText = "⚡ Foco (25 min)";
        const msg = '🌿 Pausa finalizada! Volte a focar por 25 minutos.';
        sendNotification('Pomodoro Zen', msg);
        alert(msg);
        showToast(msg);
    }
    updateDisplay();
    playBeep();
}

// Timer principal (simples e confiável)
function startTimer() {
    if (running) return;
    running = true;
    intervalId = setInterval(() => {
        if (!running) return;
        if (currentSeconds <= 0) {
            // Tempo esgotou
            clearInterval(intervalId);
            running = false;
            switchPhase();
            // Se quiser que o timer reinicie automaticamente a próxima fase, chame startTimer() aqui
            startTimer(); // comente se não quiser auto-reinício
        } else {
            currentSeconds--;
            updateDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    if (!running) return;
    running = false;
    if (intervalId) clearInterval(intervalId);
}

function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    isFocus = true;
    currentSeconds = focusTime;
    phaseText.innerText = "⚡ Foco (25 min)";
    updateDisplay();
}

function requestNotificationPermission() {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') alert('✅ Notificações ativadas!');
            else alert('❌ Permissão negada');
        });
    } else if (Notification.permission === 'granted') {
        alert('✅ Notificações já estão ativadas');
    } else {
        alert('❌ Permissão negada permanentemente. Ative nas configurações.');
    }
}

// Event listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
requestNotifyBtn.addEventListener('click', requestNotificationPermission);

// Inicialização
updateDisplay();
if (Notification.permission === 'default') Notification.requestPermission();
