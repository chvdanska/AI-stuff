// Fallout Pip-Boy Terminal Engine

// --------------------------------------------------------
// 1. CLOCK LOGIC
// --------------------------------------------------------
function updateClock() {
  const clockEl = document.getElementById('pip-clock');
  if (!clockEl) return;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
setInterval(updateClock, 1000);

// --------------------------------------------------------
// 2. RETRO SOUND EFFECTS (Web Audio API Synthesizer)
// --------------------------------------------------------
let audioCtx = null;
let droneSynth = null;
let radioStream = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  droneSynth = new DroneSynthesizer(audioCtx);
  
  // Setup Radio element
  const radio = document.getElementById('radio-audio');
  if (radio) {
    try {
      radioStream = audioCtx.createMediaElementSource(radio);
      const radioGain = audioCtx.createGain();
      radioGain.gain.setValueAtTime(0.4, audioCtx.currentTime); // default music volume
      radioStream.connect(radioGain);
      radioGain.connect(audioCtx.destination);
      window.radioGainNode = radioGain; // store ref for volume control
    } catch (e) {
      console.warn("Radio context connection failed (already connected or blocked):", e);
    }
  }
}

// Retro UI Sound Effects Generator
function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case 'hover': {
      // Very short click/tick
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
      break;
    }
    case 'click': {
      // Mechanical relay or beep click
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(600, now + 0.015);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
    case 'tab': {
      // Heavy clunk click (subtle noise + square)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }
    case 'success': {
      // Pip-Boy level up/success sound (two ascending bells)
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      gainNode.connect(audioCtx.destination);

      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
      osc2.connect(gainNode);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
      break;
    }
    case 'error': {
      // Low buzz
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
  }
}

// --------------------------------------------------------
// 3. SYNTHESIZED INDUSTRIAL DRONE (Vault Hum)
// --------------------------------------------------------
class DroneSynthesizer {
  constructor(ctx) {
    this.ctx = ctx;
    this.oscillators = [];
    this.filter = null;
    this.gainNode = null;
    this.noiseNode = null;
    this.filterLfo = null;
    this.filterLfoGain = null;
    this.isPlaying = false;
  }
  start() {
    if (this.isPlaying) return;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3); // fade in 3s

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(6, this.ctx.currentTime);

    // 4 Detuned low-frequency oscillators for heavy hum
    const freqs = [55, 55.3, 110, 110.5];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      
      // Slow frequency modulation
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.04, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(this.filter);
      
      osc.start();
      lfo.start();
      this.oscillators.push(osc, lfo);
    });

    // Add white noise for ambient background wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(90, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.gainNode);
    this.noiseNode.start();

    // Slow filter frequency sweep
    this.filterLfo = this.ctx.createOscillator();
    this.filterLfo.frequency.setValueAtTime(0.04, this.ctx.currentTime);
    this.filterLfoGain = this.ctx.createGain();
    this.filterLfoGain.gain.setValueAtTime(30, this.ctx.currentTime);
    
    this.filterLfo.connect(this.filterLfoGain);
    this.filterLfoGain.connect(this.filter.frequency);
    this.filterLfo.start();

    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    
    this.isPlaying = true;
  }
  stop() {
    if (!this.isPlaying) return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
    
    setTimeout(() => {
      this.oscillators.forEach(o => {
        try { o.stop(); } catch(e){}
      });
      if (this.noiseNode) {
        try { this.noiseNode.stop(); } catch(e){}
      }
      if (this.filterLfo) {
        try { this.filterLfo.stop(); } catch(e){}
      }
      this.oscillators = [];
      this.isPlaying = false;
    }, 1000);
  }
}

// --------------------------------------------------------
// 4. BOOT SYSTEM OPERATION
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const bootOverlay = document.getElementById('boot-overlay');
  const btnBoot = document.getElementById('btn-boot');
  const consoleEl = document.getElementById('boot-console');
  
  // Custom console boot lines
  const bootLines = [
    "ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM",
    "COPYRIGHT 1975-2077 ROBCO INDUSTRIES",
    "...",
    "BIOS Version 1.04.22-A",
    "640 KB Base Memory",
    "256 KB Extended Memory...",
    "RAM TEST: OK",
    "DETECTING STORAGE DRIVES...",
    "- PRIMARY MASTER: HARD DISK ROBCO 20MB (OK)",
    "- CO-PROCESSOR: HOLO-READER 1.2 (OK)",
    "LOAD PIP-BOY PROTOCOL... OK",
    "ESTABLISHING CONTEXT ENVELOPE...",
    "CONNECTING INTEGRATED NEURAL NETWORK...",
    "INSTALLING MODELS CORE...",
    "- GEMINI 3.5: INSTALLED [90%]",
    "- CLAUDE 3.5: INSTALLED [85%]",
    "- GPT-4O: INSTALLED [80%]",
    "USER REGISTERED: chvdanska",
    "CLASS SET: SILENT SPECIALIST",
    "...",
    "PIP-BOY TERMINAL 2000 v3.12 ONLINE."
  ];

  // Render boot lines sequentially
  let currentLine = 0;
  function printNextLine() {
    if (currentLine >= bootLines.length) {
      if (btnBoot) btnBoot.style.opacity = '1';
      return;
    }
    const div = document.createElement('div');
    div.className = 'boot-line';
    div.textContent = bootLines[currentLine];
    consoleEl.appendChild(div);
    // Auto scroll boot screen
    consoleEl.scrollTop = consoleEl.scrollHeight;
    
    currentLine++;
    setTimeout(printNextLine, 80 + Math.random() * 100);
  }

  // Start print sequence
  setTimeout(printNextLine, 500);

  // Boot click
  if (btnBoot) {
    btnBoot.addEventListener('click', () => {
      initAudio();
      playSound('success');
      
      // Hide overlay
      bootOverlay.style.opacity = '0';
      setTimeout(() => {
        bootOverlay.style.display = 'none';
        
        // Start background ambient drone loop
        if (droneSynth) droneSynth.start();
        
        // Try playing music (if enabled/loaded)
        const radio = document.getElementById('radio-audio');
        if (radio) {
          radio.play().catch(err => {
            console.log("Auto-music-play blocked, user needs to click play on radio dial");
          });
        }
      }, 500);
    });
  }

  // Setup UI event listeners
  setupTabControls();
  setupTraitsModal();
  setupInventoryPanel();
  setupQuestsEngine();
  setupAmbientControls();
  
  // Attach hover sounds to active elements
  attachHoverSounds();
});

// --------------------------------------------------------
// 5. NAVIGATION / TABS
// --------------------------------------------------------
function setupTabControls() {
  const tabs = document.querySelectorAll('.pip-tab-btn');
  const views = document.querySelectorAll('.pip-view');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = tab.getAttribute('data-view');
      
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      // Activate target
      tab.classList.add('active');
      const targetView = document.getElementById(viewId);
      if (targetView) {
        targetView.classList.add('active');
      }
      
      playSound('tab');
    });
  });
}

// --------------------------------------------------------
// 6. TRAITS DETAIL MODAL
// --------------------------------------------------------
const traitsInfo = {
  finesse: {
    title: "Finesse // Finezja",
    desc: "Zyskujesz wysokie zrozumienie anatomii i słabych punktów. Twoje ataki stają się wysoce precyzyjne i wykalkulowane.",
    effect: "+10% szansy na trafienie krytyczne we wszystkich akcjach technicznych i logicznych. Twoje standardowe ciosy/operacje mogą być jednak o 30% mniej bezpośrednio niszczycielskie, wymagając większego skupienia."
  },
  "night-person": {
    title: "Night Person // Nocny Marek",
    desc: "Jako nocny marek funkcjonujesz najlepiej w pełnej ciemności, a światło dzienne Cię rozprasza.",
    effect: "+1 do Inteligencji (IN) oraz Percepcji (PE) w godzinach 18:00 - 06:00. Otrzymujesz jednak -1 do tych samych statystyk w godzinach słonecznych (06:00 - 18:00)."
  },
  "bloody-mess": {
    title: "Bloody Mess // Krwawa Jatka",
    desc: "Sprawiasz, że wszystko wokół kończy się w najbardziej spektakularny, chaotyczny i krwawy sposób.",
    effect: "Wrogowie i problemy zawsze rozpadają się na milion kawałków. Twoje akcje mają zawsze niesamowitą oprawę dramatyczną (zawsze spektakularne zakończenia projektów)."
  },
  kamikaze: {
    title: "Kamikaze // Samobójca",
    desc: "Działasz z pełną prędkością, ignorując potencjalne zagrożenia i nie zastanawiając się nad obroną.",
    effect: "Otrzymujesz +5 do inicjatywy oraz uniku (klasy pancerza) dzięki ekstremalnej szybkości reakcji. Jednak Twoja odporność na błędy i obrażenia spada do zera (każdy krytyczny błąd przeciwnika zaboli podwójnie)."
  }
};

function setupTraitsModal() {
  const badges = document.querySelectorAll('.trait-badge');
  const modal = document.getElementById('traits-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalEffect = document.getElementById('modal-effect');
  const closeBtn = document.querySelector('.modal-close-btn');

  badges.forEach(badge => {
    badge.addEventListener('click', () => {
      const traitKey = badge.getAttribute('data-trait');
      const data = traitsInfo[traitKey];
      if (data) {
        modalTitle.textContent = data.title;
        modalDesc.textContent = data.desc;
        modalEffect.textContent = `EFEKT: ${data.effect}`;
        modal.classList.add('active');
        playSound('success');
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      playSound('click');
    });
  }

  // Close modal when clicking outside content
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        playSound('click');
      }
    });
  }
}

// --------------------------------------------------------
// 7. INVENTORY INTERACTION
// --------------------------------------------------------
const inventoryData = {
  "matura": {
    title: "Świadectwo maturalne",
    desc: "Ukończyłaś szkołę średnią z doskonałymi wynikami. Świadectwo maturalne z czerwonym paskiem to dowód na to, że wysokie statystyki Inteligencji nie wzięły się znikąd. Zapewnia stałą premię do rozwiązywania problemów logicznych na pustkowiach.",
    weight: "2 lbs",
    val: "280 caps",
    bonus: "+1 Intelligence"
  },
  "plyty-cd": {
    title: "Sterta płyt CD",
    desc: "Kolekcja starannie dobranych krążków CD. Jako oddana audiofilka nie funkcjonujesz bez muzyki. Dźwięk starych nośników napędza Cię do działania.",
    weight: "7 lbs",
    val: "100 caps",
    bonus: "+15% Action Points Regeneration"
  },
  "prawo-jazdy": {
    title: "Prawo jazdy",
    desc: "Licencja na kierowanie pojazdami kołowymi. Wszędzie jeździsz autem i robisz to niezwykle dynamicznie. Zwiększa czas reakcji na drodze i skraca czas podróży.",
    weight: "1 lb",
    val: "300 caps",
    bonus: "+5 Agility in vehicles"
  },
  "laptop": {
    title: "Wierny Laptop",
    desc: "Twój osobisty laptop, na który uzbierałaś sama ciężko zarobionymi kapslami. Towarzyszy Ci od lat i jest niezastąpionym sercem wszystkich operacji hakerskich, badawczych i programistycznych.",
    weight: "4 lbs",
    val: "235 caps",
    bonus: "+15% Science skill"
  },
  "kurs-barmanski": {
    title: "Certyfikat kursu barmańskiego",
    desc: "Dokument potwierdzający lata rzetelnej i udanej pracy za barem. Nauczona precyzyjnego odmierzania dawek, czytania ludzkich intencji oraz stoickiej cierpliwości.",
    weight: "1 lb",
    val: "111 caps",
    bonus: "+10% Barter & Speech in taverns"
  },
  "igla-nitka": {
    title: "Igła i nitka",
    desc: "Podstawowy zestaw krawiecki. Gdy nie masz pod ręką maszyny do szycia podejmujesz się prostych przeróbek krawieckich, co pozwala na sprawne łatanie uszkodzonych pancerzy.",
    weight: "3 lbs",
    val: "40 caps",
    bonus: "+10% Repair skill for armor"
  }
};

function setupInventoryPanel() {
  const rows = document.querySelectorAll('.inv-item-row');
  const descTitle = document.getElementById('inv-desc-title');
  const descBody = document.getElementById('inv-desc-body');
  const descWeight = document.getElementById('inv-desc-weight');
  const descVal = document.getElementById('inv-desc-val');

  rows.forEach(row => {
    row.addEventListener('click', () => {
      // Remove selected class
      rows.forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
      
      const itemKey = row.getAttribute('data-item');
      const item = inventoryData[itemKey];
      
      if (item) {
        descTitle.textContent = item.title;
        let bodyText = item.desc;
        if (item.bonus) {
          bodyText += `\n\n[MOD]: ${item.bonus}`;
        }
        descBody.textContent = bodyText;
        descWeight.textContent = `W: ${item.weight}`;
        descVal.textContent = `V: ${item.val}`;
        playSound('click');
      }
    });
  });

  // Select first item by default
  if (rows.length > 0) {
    rows[0].click();
  }
}

// --------------------------------------------------------
// 8. INTERACTIVE QUEST LOG (with LocalStorage)
// --------------------------------------------------------
let quests = [
  { id: 1, title: "Face the boss: Bachelor title", desc: "Ukończ przygotowania do obrony i raz na zawsze pożegnaj się z UMK.", status: "active" },
  { id: 2, title: "Infiltrate the Brotherhood of Steel", desc: "Opracuj 60 pytań na egzamin wstępny na studia II stopnia.", status: "active" },
  { id: 3, title: "New Power Armor", desc: "Przerób ubrania kupione w lumpie na pasujące rozmiarem i stylem.", status: "hold" },
  { id: 4, title: "Find the chip", desc: "Wykorzystaj własny prototyp ze Stitcha i rozwiąż swój problem braku idealnej simsowej apki.", status: "hold" },
  { id: 5, title: "Update Pip-Boy Terminal", desc: "Stwórz funkcjonalną kartę postaci o retro-futurystycznym interfejsie RobCo z lat 90.", status: "completed" }
];

function setupQuestsEngine() {
  const questListEl = document.getElementById('quest-list');
  const qTitleText = document.getElementById('quest-title-text');
  const qBodyText = document.getElementById('quest-body-text');
  const addForm = document.getElementById('quest-add-form');
  const addInput = document.getElementById('quest-add-input');

  // ==========================
  // QUEST DATA VERSION
  // ==========================
  const QUEST_VERSION = 5;

  // Check if quest data version has changed
  const savedVersion = localStorage.getItem('quest_version');

  if (savedVersion !== String(QUEST_VERSION)) {
    localStorage.removeItem('fallout_quests');
    localStorage.setItem('quest_version', String(QUEST_VERSION));
  }

  // Load saved quests (if any)
  const saved = localStorage.getItem('fallout_quests');

  if (saved) {
    try {
      quests = JSON.parse(saved);
    } catch (e) {
      console.error("Quests JSON parse error:", e);
    }
  }
  

  function saveQuests() {
    localStorage.setItem('fallout_quests', JSON.stringify(quests));
  }

  function renderQuests() {
    questListEl.innerHTML = '';
    
    quests.forEach((q, idx) => {
      const div = document.createElement('div');
      div.className = `quest-item ${idx === 0 ? 'active' : ''}`;
      div.setAttribute('data-id', q.id);
      
      const bullet = document.createElement('span');
      bullet.className = `quest-status-bullet bullet-${q.status}`;
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = q.title;
      
      div.appendChild(bullet);
      div.appendChild(titleSpan);
      
      // Click quest item to view details
      div.addEventListener('click', () => {
        document.querySelectorAll('.quest-item').forEach(qi => qi.classList.remove('active'));
        div.classList.add('active');
        
        qTitleText.textContent = q.title;
        qBodyText.innerHTML = `
          <p>${q.desc}</p>
          <br>
          <div style="display:flex; gap:10px; margin-top:15px;">
            <button class="dial-btn" onclick="updateQuestStatus(${q.id}, 'active')">Active</button>
            <button class="dial-btn" onclick="updateQuestStatus(${q.id}, 'hold')">Hold</button>
            <button class="dial-btn" onclick="updateQuestStatus(${q.id}, 'completed')">Complete</button>
            <button class="dial-btn" style="border-color:#ff5555; color:#ff5555;" onclick="deleteQuest(${q.id})">Delete</button>
          </div>
        `;
        playSound('click');
      });

      questListEl.appendChild(div);
    });

    // Select first quest on render to fill side panel
    if (quests.length > 0) {
      const activeItem = questListEl.querySelector('.quest-item');
      if (activeItem) {
        activeItem.click();
      }
    } else {
      qTitleText.textContent = "NO QUESTS ACTIVE";
      qBodyText.textContent = "Your quest log is empty. Add a new quest in the form below.";
    }
  }

  // Handle new quest submit
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = addInput.value.trim();
      if (!val) return;

      const newQ = {
        id: Date.now(),
        title: val,
        desc: "Nowe zadanie dodane z poziomu terminala. Edytuj status za pomocą przycisków sterowania.",
        status: "active"
      };

      quests.push(newQ);
      saveQuests();
      renderQuests();
      addInput.value = '';
      playSound('success');
    });
  }

  // Expose updates globally so inline onclick handlers can call them
  window.updateQuestStatus = function(id, newStatus) {
    quests = quests.map(q => {
      if (q.id === id) {
        q.status = newStatus;
      }
      return q;
    });
    saveQuests();
    renderQuests();
    playSound('success');
  };

  window.deleteQuest = function(id) {
    quests = quests.filter(q => q.id !== id);
    saveQuests();
    renderQuests();
    playSound('error');
  };

  renderQuests();
}

// --------------------------------------------------------
// 9. AMBIENT & AUDIO DIALS
// --------------------------------------------------------
function setupAmbientControls() {
  const btnHumToggle = document.getElementById('btn-hum-toggle');
  const btnMusicToggle = document.getElementById('btn-music-toggle');
  const volMusicUp = document.getElementById('vol-music-up');
  const volMusicDown = document.getElementById('vol-music-down');
  const radio = document.getElementById('radio-audio');

  if (btnHumToggle) {
    btnHumToggle.addEventListener('click', () => {
      if (droneSynth) {
        initAudio();
        if (droneSynth.isPlaying) {
          droneSynth.stop();
          btnHumToggle.textContent = "HUM: OFF";
        } else {
          droneSynth.start();
          btnHumToggle.textContent = "HUM: ON";
        }
        playSound('click');
      }
    });
  }

  if (btnMusicToggle && radio) {
    btnMusicToggle.addEventListener('click', () => {
      initAudio();
      if (radio.paused) {
        radio.play().catch(e => console.log(e));
        btnMusicToggle.textContent = "RADIO: PLAY";
      } else {
        radio.pause();
        btnMusicToggle.textContent = "RADIO: MUTE";
      }
      playSound('click');
    });
  }

  if (volMusicUp) {
    volMusicUp.addEventListener('click', () => {
      if (window.radioGainNode) {
        let current = window.radioGainNode.gain.value;
        current = Math.min(1.0, current + 0.1);
        window.radioGainNode.gain.setValueAtTime(current, audioCtx.currentTime);
        playSound('click');
      }
    });
  }

  if (volMusicDown) {
    volMusicDown.addEventListener('click', () => {
      if (window.radioGainNode) {
        let current = window.radioGainNode.gain.value;
        current = Math.max(0.0, current - 0.1);
        window.radioGainNode.gain.setValueAtTime(current, audioCtx.currentTime);
        playSound('click');
      }
    });
  }
}

// --------------------------------------------------------
// 10. DYNAMIC HOVER SOUND ATTACHMENT
// --------------------------------------------------------
function attachHoverSounds() {
  // Elements that trigger hover clicks
  const selectors = 'button, a, .special-item, .skill-item, .trait-badge, .inv-item-row, .quest-item';
  
  // Use event delegation so dynamic elements get hover sound automatically
  document.body.addEventListener('mouseenter', (e) => {
    if (e.target.matches && e.target.matches(selectors)) {
      playSound('hover');
    }
  }, true);
}
