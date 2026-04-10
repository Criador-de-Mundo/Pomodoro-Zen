// Configurações (para teste, use 10 segundos; depois mude para 25*60)
let FOCUS_TIME = 25 * 60;   // 25 minutos (ou 10 para teste)
let BREAK_TIME = 5 * 60;    // 5 minutos
let currentSeconds = FOCUS_TIME;
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

// ================= ÁUDIO (inicializado no primeiro clique) =================
let audioCtx = null;

function playBeep() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Se o contexto estiver suspenso, ele será retomado pelo clique do usuário
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
    } catch (e) { console.log("Erro no áudio", e); }
    // Vibração (funciona mesmo com tela desligada)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ================= FUNÇÕES DO TIMER =================
function updateDisplay() {
    let mins = Math.floor(currentSeconds / 60);
    let secs = currentSeconds % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

function switchPhase() {
    if (isFocus) {
        // Foco terminou -> pausa
        isFocus = false;
        currentSeconds = BREAK_TIME;
        phaseText.innerText = "🌿 Pausa curta (5 min)";
    } else {
        // Pausa terminou -> foco
        isFocus = true;
        currentSeconds = FOCUS_TIME;
        phaseText.innerText = "⚡ Foco (25 min)";
    }
    updateDisplay();
    playBeep();   // toca som e vibra
}

function tick() {
    if (!running) return;
    const now = Date.now();
    if (targetTimestamp && now >= targetTimestamp) {
        // Tempo esgotou
        running = false;
        if (intervalId) clearInterval(intervalId);
        switchPhase();
        startTimer(); // reinicia automaticamente a próxima fase
        return;
    }
    if (targetTimestamp) {
        const remaining = Math.max(0, Math.floor((targetTimestamp - now) / 1000));
        if (remaining !== currentSeconds) {
            currentSeconds = remaining;
            updateDisplay();
            if (currentSeconds === 0) {
                // Força troca (caso o timestamp tenha passado muito rápido)
                running = false;
                clearInterval(intervalId);
                switchPhase();
                startTimer();
            }
        }
    }
}

function startTimer() {
    if (running) return;
    // Ativa o áudio no primeiro clique (necessário para mobile)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();
    }
    running = true;
    targetTimestamp = Date.now() + currentSeconds * 1000;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 200);
}

function pauseTimer() {
    if (!running) return;
    running = false;
    if (intervalId) clearInterval(intervalId);
    // recalcula currentSeconds baseado no tempo restante
    if (targetTimestamp) {
        currentSeconds = Math.max(0, Math.floor((targetTimestamp - Date.now()) / 1000));
        updateDisplay();
        targetTimestamp = null;
    }
}

function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    targetTimestamp = null;
    isFocus = true;
    currentSeconds = FOCUS_TIME;
    phaseText.innerText = "⚡ Foco (25 min)";
    updateDisplay();
}

// ================= EVENTOS =================
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Inicialização
updateDisplay();
