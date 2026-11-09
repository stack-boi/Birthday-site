/* ============================================================
   Hisham · 23 — page interactions
   ============================================================ */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ============================================================
     Confetti
     ============================================================ */

  const canvas = document.getElementById("confetti-canvas");
  const ctx2d = canvas ? canvas.getContext("2d") : null;
  const COLORS = ["#c8683b", "#f2c6a0", "#eeb6ab", "#f0d59c", "#2e6f68", "#b6d1c8", "#7a5a9e", "#b23a48", "#fdf6ea"];
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  let dpr = 1;
  let particles = [];
  let confettiFrame = null;
  let lastFrame = 0;

  function sizeCanvas() {
    if (!canvas || !ctx2d) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(x, y, angle, speed, options) {
    const roll = Math.random();
    const shape = roll > 0.84 ? "ribbon" : roll > 0.68 ? "circle" : "rect";
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      shape,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: shape === "ribbon" ? 3.5 + Math.random() * 3 : 5 + Math.random() * 7,
      height: shape === "ribbon" ? 16 + Math.random() * 16 : 7 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      life: 0,
      maxLife: 2.8 + Math.random() * 2.4,
      wobble: Math.random() * Math.PI * 2,
      flutter: 0.5 + Math.random() * 0.8,
      drag: 0.32 + Math.random() * 0.35,
      gravity: options.gravity || 620,
      circular: Boolean(options.circular)
    };
  }

  function spawnBurst(x, y, count, options = {}) {
    if (!ctx2d) return;
    const angle = options.angle !== undefined ? options.angle : -Math.PI / 2;
    const spread = options.spread !== undefined ? options.spread : Math.PI * 1.4;
    const power = options.power || 1;
    const circular = options.circular || false;

    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = (95 + Math.random() * 440) * power;
      const particle = makeParticle(x, y, a, speed, { gravity: 620, circular });
      if (circular) {
        const ringAngle = (i / count) * Math.PI * 2;
        const ringSpeed = (190 + Math.random() * 300) * power;
        particle.vx = Math.cos(ringAngle) * ringSpeed;
        particle.vy = Math.sin(ringAngle) * ringSpeed;
      }
      particles.push(particle);
    }

    if (!confettiFrame) {
      lastFrame = performance.now();
      confettiFrame = requestAnimationFrame(tickConfetti);
    }
  }

  function tickConfetti(timestamp) {
    if (!ctx2d) return;
    const dt = Math.min((timestamp - lastFrame) / 1000 || 0.016, 0.05);
    lastFrame = timestamp;
    ctx2d.clearRect(0, 0, viewW, viewH);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;

      if (p.life > p.maxLife || p.y > viewH + 80) {
        particles.splice(i, 1);
        continue;
      }

      p.vy += p.gravity * dt;
      p.vx *= 1 - p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt * 3;

      const fadeIn = Math.min(1, p.life * 7);
      const fadeOut = Math.min(1, (p.maxLife - p.life) / 0.7);
      const flutter = 0.38 + Math.abs(Math.sin(p.life * 8 * p.flutter + p.wobble)) * 0.62;

      ctx2d.save();
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rot);
      ctx2d.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
      ctx2d.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx2d.beginPath();
        ctx2d.arc(0, 0, p.width * 0.55, 0, Math.PI * 2);
        ctx2d.fill();
      } else {
        ctx2d.scale(1, flutter);
        ctx2d.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      }
      ctx2d.restore();
    }

    if (particles.length) {
      confettiFrame = requestAnimationFrame(tickConfetti);
    } else {
      confettiFrame = null;
      ctx2d.clearRect(0, 0, viewW, viewH);
    }
  }

  function launchCelebration() {
    if (reduceMotion) {
      spawnBurst(viewW / 2, viewH * 0.4, 40, { power: 0.75 });
      return;
    }
    const base = viewH * 0.72;
    spawnBurst(-20, base, 65, { angle: -Math.PI / 3, spread: 0.65, power: 1.35 });
    spawnBurst(viewW + 20, base, 65, { angle: (-Math.PI * 2) / 3, spread: 0.65, power: 1.35 });
    spawnBurst(viewW / 2, viewH * 0.24, 110, { angle: -Math.PI / 2, spread: Math.PI * 1.35, power: 1.2 });
  }

  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  document.querySelectorAll("[data-confetti]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX || rect.left + rect.width / 2;
      const y = event.clientY || rect.top + rect.height / 2;
      spawnBurst(x, y, reduceMotion ? 35 : 95, { angle: -Math.PI / 2, spread: Math.PI * 1.25, power: 1.15 });
      if (!reduceMotion) {
        setTimeout(() => spawnBurst(x, y + 40, 40, { angle: -Math.PI / 2, spread: Math.PI * 0.9, power: 0.8 }), 180);
      }
    });
  });

  function autoCelebrate() {
    if (reduceMotion) return;
    setTimeout(() => {
      spawnBurst(viewW / 2, viewH * 0.3, 100, { angle: -Math.PI / 2, spread: Math.PI * 1.4, power: 1.15 });
    }, 500);
    setTimeout(() => {
      spawnBurst(-10, viewH * 0.7, 55, { angle: -Math.PI / 3, spread: 0.6, power: 1.1 });
      spawnBurst(viewW + 10, viewH * 0.7, 55, { angle: (-Math.PI * 2) / 3, spread: 0.6, power: 1.1 });
    }, 900);
  }

  if (document.readyState === "complete") {
    autoCelebrate();
  } else {
    window.addEventListener("load", autoCelebrate, { once: true });
  }

  /* ============================================================
     Scroll reveal
     ============================================================ */

  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("in"));
  }

  /* ============================================================
     Hero record parallax
     ============================================================ */

  const tiltTarget = document.querySelector("[data-tilt]");
  const heroArt = document.querySelector(".hero-art");

  if (tiltTarget && heroArt && finePointer && !reduceMotion) {
    let raf = null;
    let targetX = 0;
    let targetY = 0;

    const applyTilt = () => {
      raf = null;
      tiltTarget.style.transform = `rotateY(${targetX * 7}deg) rotateX(${-targetY * 6}deg) translate3d(${targetX * 8}px, ${targetY * 6}px, 0)`;
    };

    heroArt.addEventListener("pointermove", (event) => {
      const rect = heroArt.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });

    heroArt.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
  }

  /* ============================================================
     Turntable
     ============================================================ */

  const TRACKS = window.BIRTHDAY_TRACKS || [];
  const turntable = window.Turntable ? new window.Turntable() : null;

  const playerEl = document.getElementById("player");
  const playBtn = document.getElementById("playBtn");
  const volume = document.getElementById("volume");
  const speedButtons = Array.from(document.querySelectorAll("[data-speed]"));
  const trackButtons = Array.from(document.querySelectorAll("[data-track]"));
  const viz = document.getElementById("viz");
  const deckTitle = document.getElementById("deckTitle");
  const deckSub = document.getElementById("deckSub");
  const deckProgress = document.getElementById("deckProgress");
  const timeNow = document.getElementById("timeNow");
  const timeTotal = document.getElementById("timeTotal");
  const pressingTitle = document.getElementById("pressingTitle");
  const pressingLabel = document.querySelector(".pressing-label");
  const plSide = document.querySelector(".pl-side");
  const heroNow = document.getElementById("heroNow");
  const miniPlayer = document.getElementById("miniPlayer");
  const miniTitle = document.getElementById("miniTitle");
  const miniPause = document.getElementById("miniPause");
  const miniDisc = document.getElementById("miniDisc");
  const crateBpm = document.getElementById("crateBpm");
  const crateKey = document.getElementById("crateKey");
  const crateMood = document.getElementById("crateMood");

  let currentTrack = 0;
  let playing = false;
  let hasStarted = false;
  let elapsed = 0;
  let progressTimer = null;
  let lastProgressTick = 0;
  let speed = 33;

  function track() {
    return TRACKS[currentTrack] || { title: "", sub: "", duration: 160, durationLabel: "2:40", label: "#c8683b", ink: "#fff4e2", spin: 1.8, bpm: 84, key: "C major", mood: "warm & easy" };
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
  }

  function spinDuration() {
    const base = track().spin || 1.8;
    return (speed === 45 ? base * 0.78 : base) + "s";
  }

  function updateTrackUI(index) {
    if (!TRACKS.length) return;
    const t = TRACKS[index];

    if (playerEl) {
      playerEl.style.setProperty("--label-bg", t.label);
      playerEl.style.setProperty("--label-ink", t.ink);
      playerEl.style.setProperty("--spin-duration", spinDuration());
    }

    if (pressingTitle) pressingTitle.textContent = t.title;
    if (deckTitle) deckTitle.textContent = t.title;
    if (deckSub) deckSub.textContent = t.sub;
    if (heroNow) heroNow.textContent = t.title;
    if (miniTitle) miniTitle.textContent = t.title;
    if (timeTotal) timeTotal.textContent = t.durationLabel;
    if (plSide) plSide.textContent = "Side " + String.fromCharCode(65 + index) + " · " + (speed === 45 ? "45" : "33⅓");
    if (crateBpm) crateBpm.textContent = t.bpm + " BPM";
    if (crateKey) crateKey.textContent = t.key;
    if (crateMood) crateMood.textContent = t.mood;

    trackButtons.forEach((button) => {
      const active = Number(button.dataset.track) === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (timeNow) timeNow.textContent = "0:00";
    updateProgress();
  }

  function updateProgress() {
    const t = track();
    if (deckProgress) {
      const percent = t.duration ? Math.min(100, (elapsed / t.duration) * 100) : 0;
      deckProgress.style.width = percent + "%";
    }
    if (timeNow) timeNow.textContent = formatTime(elapsed);
  }

  function startProgress() {
    if (progressTimer) return;
    lastProgressTick = performance.now();
    progressTimer = window.setInterval(() => {
      if (!playing) return;
      const now = performance.now();
      const delta = (now - lastProgressTick) / 1000;
      lastProgressTick = now;
      const duration = track().duration || 160;
      elapsed = (elapsed + delta) % duration;
      updateProgress();
    }, 220);
  }

  function stopProgress() {
    if (progressTimer) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function setPlayingUI(on) {
    playing = on;
    if (playerEl) playerEl.classList.toggle("is-playing", on);

    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(on));
      playBtn.setAttribute("aria-label", on ? "Pause record" : "Play record");
    }

    if (on) hasStarted = true;

    if (miniPlayer) {
      miniPlayer.hidden = !hasStarted;
      miniPlayer.classList.toggle("is-paused", !on);
    }
    if (miniPause) miniPause.setAttribute("aria-label", on ? "Pause record" : "Resume record");

    if (on) {
      startProgress();
    } else {
      stopProgress();
    }
  }

  async function startPlayback() {
    if (!turntable) return;
    try {
      await turntable.play();
      setPlayingUI(true);
    } catch (error) {
      setPlayingUI(false);
      if (deckSub) deckSub.textContent = "This browser could not start the record.";
    }
  }

  function pausePlayback() {
    if (!turntable) return;
    turntable.pause();
    setPlayingUI(false);
  }

  function togglePlayback() {
    if (playing) pausePlayback();
    else startPlayback();
  }

  function selectTrack(index) {
    if (!TRACKS.length) return;
    if (index === currentTrack) {
      if (!playing) startPlayback();
      return;
    }

    const wasPlaying = playing;
    currentTrack = index;
    elapsed = 0;

    if (turntable) turntable.setTrack(index);
    updateTrackUI(index);

    if (wasPlaying) {
      startPlayback();
    } else {
      setPlayingUI(false);
    }
  }

  if (TRACKS.length && turntable) {
    updateTrackUI(0);
    setPlayingUI(false);

    if (playBtn) playBtn.addEventListener("click", togglePlayback);
    if (miniPause) miniPause.addEventListener("click", togglePlayback);
    if (miniDisc) {
      miniDisc.addEventListener("click", () => {
        const target = document.getElementById("listening");
        if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    }

    trackButtons.forEach((button) => {
      button.addEventListener("click", () => selectTrack(Number(button.dataset.track)));
    });

    speedButtons.forEach((button) => {
      button.addEventListener("click", () => {
        speed = Number(button.dataset.speed) === 45 ? 45 : 33;
        if (turntable) turntable.setSpeed(speed);

        speedButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });

        if (playerEl) playerEl.style.setProperty("--spin-duration", spinDuration());
        if (plSide) plSide.textContent = "Side " + String.fromCharCode(65 + currentTrack) + " · " + (speed === 45 ? "45" : "33⅓");
      });
    });

    if (volume) {
      const initialVolume = Number(volume.value) / 100;
      turntable.setVolume(initialVolume);
      volume.style.setProperty("--fill", volume.value + "%");

      volume.addEventListener("input", () => {
        const value = Number(volume.value);
        turntable.setVolume(value / 100);
        volume.style.setProperty("--fill", value + "%");
      });
    }

    /* visualizer */
    const bars = [];
    if (viz) {
      for (let i = 0; i < 28; i++) {
        const bar = document.createElement("span");
        viz.appendChild(bar);
        bars.push({ el: bar, value: 0.05 });
      }
    }

    const freqData = new Uint8Array(128);
    let analyser = null;

    function drawViz() {
      analyser = turntable ? turntable.getAnalyser() : null;
      if (analyser && playing) {
        analyser.getByteFrequencyData(freqData);
      }

      bars.forEach((bar, index) => {
        let target = 0.03;
        if (analyser && playing) {
          const bin = Math.min(freqData.length - 1, 2 + Math.floor(Math.pow(index / bars.length, 1.55) * 72));
          target = Math.pow(freqData[bin] / 255, 1.5) * 1.35;
          target = Math.max(0.03, Math.min(1, target));
        }
        bar.value += (target - bar.value) * (target > bar.value ? 0.42 : 0.16);
        bar.el.style.transform = "scaleY(" + Math.max(0.03, bar.value).toFixed(3) + ")";
      });

      requestAnimationFrame(drawViz);
    }
    requestAnimationFrame(drawViz);
  }

  /* ============================================================
     Cheesecake wish
     ============================================================ */

  const cakeStage = document.getElementById("cakeStage");
  const wishBtn = document.getElementById("wishBtn");
  const wishBtnLabel = document.getElementById("wishBtnLabel");
  const wishHint = document.getElementById("wishHint");
  const wishMessage = document.getElementById("wishMessage");
  let wished = false;

  if (wishMessage) wishMessage.setAttribute("aria-hidden", "true");

  if (wishBtn && cakeStage) {
    wishBtn.addEventListener("click", () => {
      wished = !wished;
      cakeStage.classList.toggle("is-wished", wished);

      if (wished) {
        if (wishBtnLabel) wishBtnLabel.textContent = "Light them again";
        if (wishHint) wishHint.textContent = "Wish filed under: officially 23.";
        if (wishMessage) wishMessage.setAttribute("aria-hidden", "false");
        launchCelebration();
        if (turntable) {
          turntable.whoosh();
          window.setTimeout(() => turntable.sparkle(), 380);
        }
      } else {
        if (wishBtnLabel) wishBtnLabel.textContent = "Blow out the candles";
        if (wishHint) wishHint.textContent = "Two candles, one wish, zero calories.";
        if (wishMessage) wishMessage.setAttribute("aria-hidden", "true");
        if (turntable) turntable.sparkle();
      }
    });
  }

  /* ============================================================
     Sleeve notes
     ============================================================ */

  const STORAGE_KEY = "hisham23-sleeve-notes-v1";
  const OWNER_KEY = "hisham23-sleeve-owner-v1";
  const NAME_KEY = "hisham23-sleeve-name-v1";
  const API_URL = "/api/notes";
  const POLL_MS = 15000;
  const IS_FILE = window.location.protocol === "file:";

  const noteForm = document.getElementById("noteForm");
  const noteInput = document.getElementById("noteInput");
  const noteName = document.getElementById("noteName");
  const noteCount = document.getElementById("noteCount");
  const noteStatus = document.getElementById("noteStatus");
  const noteWall = document.getElementById("noteWall");
  const noteTotal = document.getElementById("noteTotal");
  const noteSync = document.getElementById("noteSync");

  const noteChannel = (() => {
    try {
      return "BroadcastChannel" in window ? new BroadcastChannel("hisham23-notes") : null;
    } catch (error) {
      return null;
    }
  })();

  const seedNotes = [
    { text: "May your ears stay golden and your coffee stay hot. The same way you made coffee at 12pm or even later  Happy 23 (BUDDHA), legend.", author: "apka lover pro" },
    { text: "Get a girlfriend. A sane one this time", author: "Batli special" },
    { text: "Chummi lele par budday sabse best ho", author: "You know who" },
    { text: "Glad we became friends and glad to have you as my bully friend but bully karna band karde na bhai mujhe😭 Nevertheless you is great Have a great day✨️😌", author: "Nandini" },
    { text: "Happy birthday to the ultimate all-in-one package! You casually top the class, crush every life skill, and still remain the most humble, caring person who brings smiles to everyone. You deserve the absolute world!", author: "Reshu" },
    { text: "Congratulations on surviving another year of being yourself. Thank you for making irritating me your full-time job and arguing with me like there's a prize money involved. Honestly, I don't know how I tolerate you, but I guess some friendships are worth the mental damage. 😂 Here's to more arguments, stupid conversations and endless nonsense. Don't change (actually, please consider it). Have the best birthday! ❤️", author: "Alan"}
  ];

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function getOwnerId() {
    try {
      let owner = window.localStorage.getItem(OWNER_KEY);
      if (!owner || !/^[a-zA-Z0-9-]{8,64}$/.test(owner)) {
        owner = makeId();
        window.localStorage.setItem(OWNER_KEY, owner);
      }
      return owner;
    } catch (error) {
      return makeId();
    }
  }

  const ownerId = getOwnerId();

  let pendingNotes = loadNotes();
  let sharedNotes = [];
  let syncState = "idle";
  let syncing = false;
  let syncQueued = false;
  let noteSubmitting = false;
  let statusTimer = 0;

  function loadNotes() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((note) => note && typeof note.text === "string" && note.text.trim())
        .map((note) => ({
          id: typeof note.id === "string" && /^[a-zA-Z0-9-]{6,40}$/.test(note.id) ? note.id : makeId(),
          text: note.text.trim().slice(0, 220),
          author: typeof note.author === "string" ? note.author.trim().slice(0, 24) : "",
          owner: typeof note.owner === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(note.owner) ? note.owner : ownerId,
          ts: Number(note.ts) || Date.now()
        }))
        .slice(0, 60);
    } catch (error) {
      return [];
    }
  }

  function saveNotes() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingNotes));
    } catch (error) {
      /* private mode, storage full, etc. */
    }
  }

  function setSyncState(state) {
    syncState = state;
    if (!noteSync) return;

    const copy = {
      idle: ["this device", "Notes are saved in this browser."],
      local: ["this device", "Notes are saved in this browser. They sync when the site is live on Netlify."],
      syncing: ["syncing…", "Checking the shared sleeve."],
      live: ["shared live", "Notes are shared with everyone visiting the live site."],
      offline: ["saved here", "The shared sleeve is unreachable, so notes stay in this browser for now."]
    };

    const [label, title] = copy[state] || copy.idle;
    noteSync.textContent = label;
    noteSync.className = "note-sync is-" + (state === "idle" ? "local" : state);
    noteSync.title = title;
  }

  async function apiRequest(method, payload) {
    const options = {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-note-owner": ownerId
      }
    };

    if (payload) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(API_URL, options);
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      /* some hosts return HTML for a missing API route */
    }

    if (!response.ok) {
      const failure = new Error(data.error || "The shared sleeve is unavailable right now.");
      failure.status = response.status;
      throw failure;
    }

    return data;
  }

  function notesSignature(list) {
    return list.map((note) => `${note.id}:${note.ts}:${note.canDelete ? 1 : 0}:${note.text}`).join("|");
  }

  async function syncNotes() {
    if (IS_FILE) {
      setSyncState("local");
      return;
    }

    if (syncing) {
      syncQueued = true;
      return;
    }

    syncing = true;
    setSyncState("syncing");

    const before = notesSignature(sharedNotes) + "::" + pendingNotes.map((note) => note.id).join(",");

    try {
      const data = await apiRequest("GET");
      if (!Array.isArray(data.notes)) throw new Error("The shared sleeve sent an unexpected reply.");

      sharedNotes = data.notes
        .filter((note) => note && typeof note.id === "string" && typeof note.text === "string" && note.text.trim())
        .map((note) => ({
          id: note.id,
          text: note.text.trim().slice(0, 220),
          author: typeof note.author === "string" ? note.author.trim().slice(0, 24) : "",
          ts: Number(note.ts) || 0,
          canDelete: Boolean(note.canDelete)
        }));

      const stillPending = [];

      for (const note of pendingNotes) {
        if (sharedNotes.some((shared) => shared.id === note.id)) continue;

        try {
          const result = await apiRequest("POST", {
            id: note.id,
            text: note.text,
            author: note.author,
            owner: ownerId
          });
          if (result.note) {
            sharedNotes = [result.note, ...sharedNotes.filter((shared) => shared.id !== result.note.id)];
          }
        } catch (error) {
          if (error.status === 409) {
            stillPending.push({ ...note, id: makeId() });
          } else {
            stillPending.push(note);
          }
        }
      }

      pendingNotes = stillPending;
      saveNotes();
      setSyncState("live");

      const after = notesSignature(sharedNotes) + "::" + pendingNotes.map((note) => note.id).join(",");
      if (before !== after) renderNotes();
    } catch (error) {
      setSyncState("offline");
    } finally {
      syncing = false;
      if (syncQueued) {
        syncQueued = false;
        syncNotes();
      }
    }
  }

  function noteDate(timestamp) {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function setNoteStatus(message, duration = 4200) {
    if (!noteStatus) return;
    window.clearTimeout(statusTimer);
    noteStatus.textContent = message;
    if (message) {
      statusTimer = window.setTimeout(() => {
        if (noteStatus) noteStatus.textContent = "";
      }, duration);
    }
  }

  function makeNoteCard(note, source) {
    const article = document.createElement("article");
    article.className = "note-card";
    article.dataset.noteId = note.id;

    const text = document.createElement("p");
    text.textContent = note.text;
    article.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "note-card-meta";

    const own = source === "pending" || (source === "shared" && note.canDelete);
    const author = document.createElement("span");

    if (source === "seed") {
      author.textContent = note.author;
    } else if (own) {
      author.textContent = (note.author ? note.author + " (you)" : "You") + " · " + noteDate(note.ts);
    } else {
      author.textContent = (note.author || "A guest") + " · " + noteDate(note.ts);
    }

    author.title = source === "seed" ? note.author : note.author || "A guest";
    meta.appendChild(author);

    if (own) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "note-remove";
      remove.dataset.id = note.id;
      remove.dataset.source = source;
      remove.setAttribute("aria-label", "Remove your note");
      remove.textContent = "×";
      meta.appendChild(remove);
    }

    article.appendChild(meta);
    return article;
  }

  function renderNotes() {
    if (!noteWall) return;

    const seen = new Set();
    const custom = [];

    sharedNotes.forEach((note) => {
      if (seen.has(note.id)) return;
      seen.add(note.id);
      custom.push({ note, source: "shared" });
    });

    pendingNotes.forEach((note) => {
      if (seen.has(note.id)) return;
      seen.add(note.id);
      custom.push({ note, source: "pending" });
    });

    custom.sort((a, b) => (Number(b.note.ts) || 0) - (Number(a.note.ts) || 0));

    const ordered = [
      ...custom,
      ...seedNotes.map((note) => ({ note, source: "seed" }))
    ];

    noteWall.textContent = "";
    ordered.forEach(({ note, source }) => {
      noteWall.appendChild(makeNoteCard(note, source));
    });

    if (noteTotal) {
      noteTotal.textContent = String(ordered.length).padStart(2, "0") + (ordered.length === 1 ? " note" : " notes");
    }
  }

  try {
    if (noteName) noteName.value = window.localStorage.getItem(NAME_KEY) || "";
  } catch (error) {
    /* ignore */
  }

  renderNotes();
  setSyncState(IS_FILE ? "local" : "syncing");

  if (!IS_FILE) {
    syncNotes();
    window.setInterval(() => {
      if (!document.hidden) syncNotes();
    }, POLL_MS);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) syncNotes();
    });
    window.addEventListener("online", syncNotes);
  }

  if (noteChannel) {
    noteChannel.addEventListener("message", (event) => {
      if (event.data === "sync" && !IS_FILE) syncNotes();
    });
  }

  if (noteInput && noteCount) {
    noteInput.addEventListener("input", () => {
      noteCount.textContent = String(noteInput.value.length);
    });
  }

  if (noteForm && noteInput) {
    noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (noteSubmitting) return;

      const text = noteInput.value.trim();
      if (!text) {
        setNoteStatus("Write something first — even “happy birthday” counts.");
        return;
      }

      const author = noteName ? noteName.value.trim().slice(0, 24) : "";
      try {
        if (author) window.localStorage.setItem(NAME_KEY, author);
        else window.localStorage.removeItem(NAME_KEY);
      } catch (error) {
        /* ignore */
      }

      noteSubmitting = true;
      const note = {
        id: makeId(),
        text: text.slice(0, 220),
        author,
        owner: ownerId,
        ts: Date.now()
      };

      pendingNotes.unshift(note);
      pendingNotes = pendingNotes.slice(0, 60);
      saveNotes();
      renderNotes();

      noteInput.value = "";
      if (noteCount) noteCount.textContent = "0";

      const wallRect = noteWall ? noteWall.getBoundingClientRect() : null;
      if (wallRect) {
        spawnBurst(wallRect.left + wallRect.width / 2, wallRect.top + 30, reduceMotion ? 22 : 46, {
          angle: -Math.PI / 2,
          spread: Math.PI * 1.2,
          power: 0.75
        });
      }
      if (turntable) turntable.sparkle();

      if (IS_FILE) {
        setNoteStatus("Saved on this device. It joins the shared sleeve when the site is live.");
        noteSubmitting = false;
        return;
      }

      setNoteStatus("Pinning it to the shared sleeve…");

      try {
        const result = await apiRequest("POST", {
          id: note.id,
          text: note.text,
          author: note.author,
          owner: ownerId
        });

        if (result.note) {
          sharedNotes = [result.note, ...sharedNotes.filter((shared) => shared.id !== result.note.id)];
        }
        pendingNotes = pendingNotes.filter((pending) => pending.id !== note.id);
        saveNotes();
        setSyncState("live");
        renderNotes();
        setNoteStatus("Pinned to the shared sleeve. Everyone can see that one.");
        if (noteChannel) noteChannel.postMessage("sync");
      } catch (error) {
        setSyncState("offline");
        setNoteStatus(
          error.status === 404 || error.status === 405
            ? "The shared sleeve isn’t connected here, so this note is saved on this device."
            : "The shared sleeve is unreachable right now — saved here and will retry.",
          6000
        );
      } finally {
        noteSubmitting = false;
      }
    });
  }

  if (noteWall) {
    noteWall.addEventListener("click", async (event) => {
      const button = event.target.closest(".note-remove");
      if (!button) return;

      const id = button.dataset.id;
      const source = button.dataset.source;

      if (source === "pending") {
        pendingNotes = pendingNotes.filter((note) => note.id !== id);
        saveNotes();
        renderNotes();
        setNoteStatus("Note removed from the sleeve.");
        return;
      }

      if (navigator.onLine === false) {
        setNoteStatus("You’re offline — reconnect to remove a shared note.", 5000);
        return;
      }

      button.disabled = true;

      try {
        await apiRequest("DELETE", { id, owner: ownerId });
        sharedNotes = sharedNotes.filter((note) => note.id !== id);
        pendingNotes = pendingNotes.filter((note) => note.id !== id);
        saveNotes();
        renderNotes();
        setSyncState("live");
        setNoteStatus("Note removed from the sleeve.");
        if (noteChannel) noteChannel.postMessage("sync");
      } catch (error) {
        if (error.status === 404) {
          sharedNotes = sharedNotes.filter((note) => note.id !== id);
          renderNotes();
          setNoteStatus("That note was already off the sleeve.");
        } else {
          button.disabled = false;
          setNoteStatus(error.message || "Couldn’t remove that note right now.", 5000);
        }
      }
    });
  }

  /* ============================================================
     Small niceties
     ============================================================ */

  /* Pause the hero eq animation when nothing is playing. */
  if (playerEl) {
    const syncEq = () => {
      const active = playerEl.classList.contains("is-playing");
      document.querySelectorAll(".eq, .foot-eq").forEach((eq) => {
        eq.style.opacity = active ? "1" : "0.55";
      });
    };
    const observer = new MutationObserver(syncEq);
    observer.observe(playerEl, { attributes: true, attributeFilter: ["class"] });
    syncEq();
  }

  /* Keep clicks on placeholder-style anchors from jumping before layout. */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (link.getAttribute("href") === "#") {
        link.setAttribute("href", "#top");
      }
    });
  });
})();
