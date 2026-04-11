// Configurações
let FOCUS_TIME = 10;   // 25 minutos
let BREAK_TIME = 5;    // 5 minutos
let currentSeconds = FOCUS_TIME;
let isFocus = true;
let running = false;
let targetTimestamp = null;
let intervalId = null;
let vibrationInterval = null;

// Elementos DOM
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// ================= ÁUDIO =================
let audioCtx = null;

function playBeep() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => createBeep());
    } else {
        createBeep();
    }
}

function createBeep() {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        osc.stop(audioCtx.currentTime + 1);
    } catch (e) {
        console.log("Erro no áudio", e);
    }
}

// ================= VIBRAÇÃO CONTÍNUA =================
function startContinuousVibration() {
    if (vibrationInterval) clearInterval(vibrationInterval);
    vibrationInterval = setInterval(() => {
        if (navigator.vibrate) navigator.vibrate(500); // vibra 500ms a cada 1s
    }, 1000);
}

function stopContinuousVibration() {
    if (vibrationInterval) {
        clearInterval(vibrationInterval);
        vibrationInterval = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);
}

// ================= TIMER =================
function updateDisplay() {
    let mins = Math.floor(currentSeconds / 60);
    let secs = currentSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function finishPhaseAndWait() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    targetTimestamp = null;
    playBeep();                // toca um beep
    startContinuousVibration(); // vibra até o usuário agir

    if (isFocus) {
        phaseText.innerText = "🍅 Foco concluído! Toque em INICIAR para a pausa";
        startBtn.textContent = "▶ INICIAR PAUSA";
    } else {
        phaseText.innerText = "🌿 Pausa concluída! Toque em INICIAR para o foco";
        startBtn.textContent = "▶ INICIAR FOCO";
    }
    startBtn.classList.add("btn-primary");
}

function startTimer() {
    if (running) return;
    stopContinuousVibration();       // para qualquer vibração pendente
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();
    }
    running = true;
    targetTimestamp = Date.now() + currentSeconds * 1000;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 200);
    startBtn.textContent = "▶ INICIAR";
    phaseText.innerText = isFocus ? "⚡ Foco (25 min)" : "🌿 Pausa curta (5 min)";
    startBtn.classList.add("btn-primary");
}

function tick() {
    if (!running) return;
    const now = Date.now();
    if (targetTimestamp && now >= targetTimestamp) {
        running = false;
        if (intervalId) clearInterval(intervalId);
        finishPhaseAndWait();
        return;
    }
    if (targetTimestamp) {
        const remaining = Math.max(0, Math.floor((targetTimestamp - now) / 1000));
        if (remaining !== currentSeconds) {
            currentSeconds = remaining;
            updateDisplay();
            if (currentSeconds === 0) {
                running = false;
                clearInterval(intervalId);
                finishPhaseAndWait();
            }
        }
    }
}

function startNextPhase() {
    if (running) return;
    // Se está em espera (vibração ativa), troca de fase
    if (vibrationInterval !== null) {
        stopContinuousVibration();
        if (isFocus) {
            isFocus = false;
            currentSeconds = BREAK_TIME;
        } else {
            isFocus = true;
            currentSeconds = FOCUS_TIME;
        }
        updateDisplay();
        startTimer();
    } else {
        // Caso contrário, apenas inicia o timer (se estiver parado)
        if (!running && currentSeconds > 0) {
            startTimer();
        }
    }
}

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

function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    stopContinuousVibration();
    targetTimestamp = null;
    isFocus = true;
    currentSeconds = FOCUS_TIME;
    phaseText.innerText = "⚡ Foco (25 min)";
    updateDisplay();
    startBtn.textContent = "▶ INICIAR";
    startBtn.classList.add("btn-primary");
}

// ================= EVENTOS =================
startBtn.addEventListener('click', startNextPhase);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Inicialização
updateDisplay();
