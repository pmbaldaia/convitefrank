const screens = [...document.querySelectorAll(".screen")];

const progress = document.getElementById("progress");
const progressLabel = document.getElementById("progressLabel");
const progressHint = document.getElementById("progressHint");
const progressFill = document.getElementById("progressFill");

const challengeMap = {
  choices: [1, 4],
  memory: [2, 4],
  clues: [3, 4],
  "final-code": [4, 4]
};

let almostTimer = null;

function show(name) {
  if (almostTimer) {
    clearTimeout(almostTimer);
    almostTimer = null;
  }

  screens.forEach(screen => screen.classList.remove("active"));

  const next = document.querySelector(`[data-screen="${name}"]`);
  if (!next) {
    console.error(`Ecrã não encontrado: ${name}`);
    return;
  }

  next.classList.add("active");

  if (challengeMap[name]) {
    progress.hidden = false;
    const [current, total] = challengeMap[name];
    const percent = Math.round((current / total) * 100);

    progressLabel.textContent = `Desafio ${current}/${total}`;
    progressHint.textContent = `${percent}%`;

    requestAnimationFrame(() => {
      progressFill.style.width = `${percent}%`;
    });
  } else {
    progress.hidden = true;
  }

  if (name === "memory") {
    prepareMemoryScreen();
  }

  if (name === "almost") {
    const loadingBar = next.querySelector(".loading-line span");

    // Reinicia visualmente a barra sempre que este ecrã é aberto.
    if (loadingBar) {
      loadingBar.style.animation = "none";
      void loadingBar.offsetWidth;
      loadingBar.style.animation = "almostLoading 3s linear forwards";
    }

    almostTimer = setTimeout(() => {
      almostTimer = null;
      show("message-1");
    }, 3000);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => show(button.dataset.go));
});

/* =========================================================
   NOME
========================================================= */

const nameInput = document.getElementById("nameInput");
const nameContinue = document.getElementById("nameContinue");
const nameFeedback = document.getElementById("nameFeedback");

function validateName() {
  const name = nameInput.value.trim();

  if (!name) {
    nameFeedback.textContent = "Primeiro precisamos mesmo do teu nome.";
    nameFeedback.className = "feedback error";
    return;
  }

  if (name.toLowerCase() !== "francisco") {
    nameFeedback.textContent = "Hum… esta surpresa parece ter sido preparada para outra pessoa 😄";
    nameFeedback.className = "feedback error";
    return;
  }

  nameFeedback.textContent = "Perfeito. Podemos continuar.";
  nameFeedback.className = "feedback success";

  setTimeout(() => show("envelope"), 450);
}

nameContinue.addEventListener("click", validateName);
nameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") validateName();
});

/* =========================================================
   ENVELOPE
========================================================= */

const envelope = document.getElementById("openEnvelope");
const openEnvelopeButton = document.getElementById("openEnvelopeButton");

let envelopeOpened = false;

function openEnvelope() {
  if (envelopeOpened) return;

  envelopeOpened = true;
  envelope.classList.add("opened");
  openEnvelopeButton.disabled = true;

  setTimeout(() => show("choices"), 900);
}

envelope.addEventListener("click", openEnvelope);
openEnvelopeButton.addEventListener("click", openEnvelope);

/* =========================================================
   DESAFIO 1 — ESCOLHAS
========================================================= */

const choiceData = [
  ["🧑‍🤝‍🧑", "A malta"],
  ["🍻", "Uns copos"],
  ["😂", "Boas histórias"],
  ["🎯", "Desafios"],
  ["✈️", "Uma escapadinha"],
  ["🍽️", "Boa comida"],
  ["🎵", "Música"],
  ["🎉", "Festa"],
  ["🤫", "Surpresas"]
];

const choiceGrid = document.getElementById("choiceGrid");
const choiceContinue = document.getElementById("choiceContinue");
const choiceFeedback = document.getElementById("choiceFeedback");

let selectedChoices = new Set();

function buildChoices() {
  choiceGrid.innerHTML = "";
  selectedChoices = new Set();
  choiceContinue.disabled = true;
  choiceFeedback.textContent = "";
  choiceFeedback.className = "feedback";

  choiceData.forEach(([icon, label], index) => {
    const button = document.createElement("button");
    button.className = "choice-card";
    button.type = "button";
    button.innerHTML = `<span>${icon}</span><strong>${label}</strong>`;

    button.addEventListener("click", () => {
      if (selectedChoices.has(index)) {
        selectedChoices.delete(index);
        button.classList.remove("selected");
      } else {
        if (selectedChoices.size === 3) {
          choiceFeedback.textContent = "Escolhe apenas 3.";
          choiceFeedback.className = "feedback error";
          return;
        }

        selectedChoices.add(index);
        button.classList.add("selected");
      }

      if (selectedChoices.size === 3) {
        choiceFeedback.textContent = "Boa escolha.";
        choiceFeedback.className = "feedback success";
        choiceContinue.disabled = false;
      } else {
        choiceFeedback.textContent = `${selectedChoices.size}/3 escolhidas`;
        choiceFeedback.className = "feedback";
        choiceContinue.disabled = true;
      }
    });

    choiceGrid.appendChild(button);
  });
}

choiceContinue.addEventListener("click", () => show("memory"));

buildChoices();

/* =========================================================
   DESAFIO 2 — MEMÓRIA
   Implementação simples e robusta, sem flip 3D.
========================================================= */

const memoryIcons = ["🍻", "🎉", "🕶️", "🎯", "✈️", "🤫"];

const memoryIntro = document.getElementById("memoryIntro");
const memoryGame = document.getElementById("memoryGame");
const memoryStartButton = document.getElementById("memoryStartButton");
const memoryRestartButton = document.getElementById("memoryRestartButton");
const memoryGrid = document.getElementById("memoryGrid");
const movesEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const memoryFeedback = document.getElementById("memoryFeedback");

let memoryDeck = [];
let memoryFirstCard = null;
let memorySecondCard = null;
let memoryLock = false;
let memoryMatchedPairs = 0;
let memoryMoves = 0;
let memorySeconds = 0;
let memoryTimer = null;
let memoryStarted = false;
let memoryCompleted = false;

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function stopMemoryTimer() {
  if (memoryTimer !== null) {
    clearInterval(memoryTimer);
    memoryTimer = null;
  }
}

function startMemoryTimer() {
  if (memoryStarted || memoryCompleted) return;

  memoryStarted = true;
  memoryTimer = setInterval(() => {
    memorySeconds += 1;
    timerEl.textContent = formatTime(memorySeconds);
  }, 1000);
}

function resetMemoryState() {
  stopMemoryTimer();

  memoryFirstCard = null;
  memorySecondCard = null;
  memoryLock = false;
  memoryMatchedPairs = 0;
  memoryMoves = 0;
  memorySeconds = 0;
  memoryStarted = false;
  memoryCompleted = false;

  movesEl.textContent = "0";
  timerEl.textContent = "00:00";
  memoryFeedback.textContent = "";
  memoryFeedback.className = "feedback";
}

function revealMemoryCard(card) {
  card.classList.add("is-open");
  card.disabled = true;

  const icon = card.dataset.icon;
  card.innerHTML = `<span class="memory-card__icon">${icon}</span>`;
}

function hideMemoryCard(card) {
  if (!card || card.classList.contains("is-matched")) return;

  card.classList.remove("is-open");
  card.disabled = false;
  card.innerHTML = `
    <span class="memory-card__logo-wrap">
      <img src="assets/ap-logo-transparent.png" alt="" />
    </span>
  `;
}

function markMemoryMatch(first, second) {
  [first, second].forEach(card => {
    card.classList.remove("is-open");
    card.classList.add("is-matched");
    card.disabled = true;
    card.innerHTML = `
      <span class="memory-card__icon">${card.dataset.icon}</span>
      <span class="memory-card__check">✓</span>
    `;
  });
}

function completeMemory() {
  memoryCompleted = true;
  memoryLock = true;
  stopMemoryTimer();

  memoryFeedback.textContent = "Conseguiste! Todos os pares encontrados.";
  memoryFeedback.className = "feedback success";

  setTimeout(() => {
    show("clues");
  }, 1100);
}

function handleMemoryCard(card) {
  if (
    memoryLock ||
    memoryCompleted ||
    card.classList.contains("is-matched") ||
    card === memoryFirstCard
  ) {
    return;
  }

  startMemoryTimer();
  revealMemoryCard(card);

  if (!memoryFirstCard) {
    memoryFirstCard = card;
    return;
  }

  memorySecondCard = card;
  memoryMoves += 1;
  movesEl.textContent = String(memoryMoves);

  const isMatch = memoryFirstCard.dataset.pair === memorySecondCard.dataset.pair;

  if (isMatch) {
    markMemoryMatch(memoryFirstCard, memorySecondCard);

    memoryMatchedPairs += 1;
    memoryFirstCard = null;
    memorySecondCard = null;

    if (memoryMatchedPairs === memoryIcons.length) {
      completeMemory();
    }

    return;
  }

  memoryLock = true;

  const first = memoryFirstCard;
  const second = memorySecondCard;

  setTimeout(() => {
    hideMemoryCard(first);
    hideMemoryCard(second);

    memoryFirstCard = null;
    memorySecondCard = null;
    memoryLock = false;
  }, 850);
}

function buildMemory() {
  resetMemoryState();

  memoryDeck = shuffle(
    memoryIcons.flatMap((icon, pair) => [
      { icon, pair, id: `${pair}-a` },
      { icon, pair, id: `${pair}-b` }
    ])
  );

  memoryGrid.innerHTML = "";

  memoryDeck.forEach(item => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "memory-card";
    card.dataset.pair = String(item.pair);
    card.dataset.icon = item.icon;
    card.dataset.id = item.id;
    card.setAttribute("aria-label", "Carta de memória");

    card.innerHTML = `
      <span class="memory-card__logo-wrap">
        <img src="assets/ap-logo-transparent.png" alt="" />
      </span>
    `;

    card.addEventListener("click", () => handleMemoryCard(card));

    memoryGrid.appendChild(card);
  });
}

function prepareMemoryScreen() {
  memoryGame.hidden = true;
  memoryIntro.hidden = false;
  buildMemory();
}

function startMemoryGame() {
  memoryIntro.hidden = true;
  memoryGame.hidden = false;
  buildMemory();
  startMemoryTimer();
}

memoryStartButton.addEventListener("click", startMemoryGame);
memoryRestartButton.addEventListener("click", startMemoryGame);

prepareMemoryScreen();

/* =========================================================
   PUZZLES DE PALAVRAS
========================================================= */

function createWordPuzzle({
  secret,
  slotsEl,
  bankEl,
  resetBtn,
  checkBtn,
  feedbackEl,
  successMessage,
  onSuccess
}) {
  let shuffledLetters = [];
  let answer = [];
  let used = new Set();
  let completed = false;

  function reset() {
    shuffledLetters = shuffle(
      secret.split("").map((letter, id) => ({ letter, id }))
    );

    answer = [];
    used = new Set();
    completed = false;

    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    checkBtn.disabled = true;

    render();
  }

  function render() {
    slotsEl.innerHTML = "";

    for (let i = 0; i < secret.length; i++) {
      const slot = document.createElement("div");
      slot.className = "word-slot";
      slot.textContent = answer[i]?.letter || "";
      slotsEl.appendChild(slot);
    }

    bankEl.innerHTML = "";

    shuffledLetters.forEach(item => {
      const button = document.createElement("button");
      button.className = "letter-btn";
      button.type = "button";
      button.textContent = item.letter;
      button.disabled = used.has(item.id) || completed;

      button.addEventListener("click", () => {
        if (completed || answer.length >= secret.length) return;

        answer.push(item);
        used.add(item.id);

        feedbackEl.textContent = "";
        feedbackEl.className = "feedback";

        render();
      });

      bankEl.appendChild(button);
    });

    checkBtn.disabled = completed || answer.length !== secret.length;
  }

  resetBtn.addEventListener("click", reset);

  checkBtn.addEventListener("click", () => {
    if (completed) return;

    const attempt = answer.map(item => item.letter).join("");

    if (attempt !== secret) {
      feedbackEl.textContent = "Ainda não. Tenta outra ordem.";
      feedbackEl.className = "feedback error";

      slotsEl.classList.remove("shake");
      void slotsEl.offsetWidth;
      slotsEl.classList.add("shake");

      return;
    }

    completed = true;
    feedbackEl.textContent = successMessage;
    feedbackEl.className = "feedback success";

    render();

    setTimeout(onSuccess, 700);
  });

  return { reset };
}

const cluePuzzle = createWordPuzzle({
  secret: "DESPEDIDA",
  slotsEl: document.getElementById("clueSlots"),
  bankEl: document.getElementById("clueLetters"),
  resetBtn: document.getElementById("clueReset"),
  checkBtn: document.getElementById("clueCheck"),
  feedbackEl: document.getElementById("clueFeedback"),
  successMessage: "Certo.",
  onSuccess: () => show("final-code")
});

const namePuzzle = createWordPuzzle({
  secret: "FRANCISCO",
  slotsEl: document.getElementById("nameSlots"),
  bankEl: document.getElementById("nameLetters"),
  resetBtn: document.getElementById("nameReset"),
  checkBtn: document.getElementById("nameCheck"),
  feedbackEl: document.getElementById("finalCodeFeedback"),
  successMessage: "Perfeito.",
  onSuccess: () => show("almost")
});

cluePuzzle.reset();
namePuzzle.reset();


/* =========================================================
   BOTÃO NÃO
========================================================= */

const noButton = document.getElementById("noButton");
const finalActions = document.getElementById("finalActions");
let noMoves = 0;

function moveNoButton() {
  noMoves += 1;

  const maxX = Math.max(10, finalActions.clientWidth - noButton.offsetWidth);
  const maxY = 74;

  noButton.style.position = "absolute";
  noButton.style.left = `${Math.floor(Math.random() * maxX)}px`;
  noButton.style.top = `${Math.floor(Math.random() * maxY)}px`;

  const labels = [
    "Não",
    "Tens a certeza?",
    "A missão é tua…",
    "Não vale fugir 😄"
  ];

  noButton.textContent = labels[Math.min(noMoves, labels.length - 1)];
}

noButton.addEventListener("mouseenter", moveNoButton);
noButton.addEventListener("click", moveNoButton);

noButton.addEventListener(
  "touchstart",
  event => {
    event.preventDefault();
    moveNoButton();
  },
  { passive: false }
);

/* =========================================================
   CONFETTI
========================================================= */

function launchConfetti() {
  const layer = document.getElementById("confettiLayer");
  const colors = ["#6f836f", "#526653", "#bd9f69", "#e8ddcf", "#f8f5ef"];

  for (let i = 0; i < 100; i++) {
    const piece = document.createElement("span");

    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.5 + Math.random() * 2.2}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.setProperty("--drift", `${-150 + Math.random() * 300}px`);
    piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);

    layer.appendChild(piece);

    setTimeout(() => piece.remove(), 5200);
  }
}

document.getElementById("yesButton").addEventListener("click", () => {
  launchConfetti();
  setTimeout(() => show("success"), 350);
});

/* =========================================================
   RECOMEÇAR
========================================================= */

document.getElementById("restart").addEventListener("click", () => {
  nameInput.value = "";
  nameFeedback.textContent = "";
  nameFeedback.className = "feedback";

  envelopeOpened = false;
  envelope.classList.remove("opened");
  openEnvelopeButton.disabled = false;

  buildChoices();
  prepareMemoryScreen();
  cluePuzzle.reset();
  namePuzzle.reset();

  noMoves = 0;
  noButton.textContent = "Não";
  noButton.style.position = "relative";
  noButton.style.left = "";
  noButton.style.top = "";

  progressFill.style.width = "0";

  show("intro");
});
