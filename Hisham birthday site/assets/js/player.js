/* ============================================================
   Turntable — a tiny live lo-fi synth
   Three original loops, generated with Web Audio.
   No audio files, no samples, just oscillators + noise.
   ============================================================ */

(function () {
  "use strict";

  const NOTE_OFFSET = {
    C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
    "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
  };

  function noteToHz(name) {
    const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
    if (!match) return 440;
    const midi = 12 * (parseInt(match[2], 10) + 1) + NOTE_OFFSET[match[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  const TRACKS = [
    {
      id: "cherry",
      title: "Cherry On Top",
      sub: "warm keys · slow groove",
      duration: 167,
      durationLabel: "2:47",
      label: "#c8683b",
      ink: "#fff4e2",
      bpm: 84,
      key: "C major",
      mood: "warm & easy",
      spin: 1.8,
      swing: 0,
      style: "lofi",
      bars: [
        { chord: ["C4", "E4", "G4", "B4"], bass: "C2" },
        { chord: ["A3", "C4", "E4", "G4"], bass: "A1" },
        { chord: ["F3", "A3", "C4", "E4"], bass: "F1" },
        { chord: ["G3", "B3", "D4", "F4"], bass: "G1" }
      ],
      melody: [
        "E5", null, "G5", null, "B5", "A5", "G5", null,
        "C5", null, "E5", "G5", null, "E5", "D5", null,
        "A4", "C5", "E5", null, "F5", "E5", "C5", null,
        "B4", "D5", "G5", "F5", "D5", null, "B4", null
      ]
    },
    {
      id: "blueberry",
      title: "Blueberry Static",
      sub: "dreamy · after hours",
      duration: 192,
      durationLabel: "3:12",
      label: "#7a5a9e",
      ink: "#fdf6ff",
      bpm: 70,
      key: "A minor",
      mood: "dreamy dusk",
      spin: 2.2,
      swing: 0,
      style: "dream",
      bars: [
        { chord: ["A3", "C4", "E4", "G4"], bass: "A1" },
        { chord: ["F3", "A3", "C4", "E4"], bass: "F1" },
        { chord: ["C4", "E4", "G4", "B4"], bass: "C2" },
        { chord: ["G3", "B3", "D4", "E4"], bass: "G1" }
      ],
      melody: [
        "A4", null, null, "E5", "G5", null, "E5", null,
        "F4", null, "A4", "C5", "E5", null, "C5", null,
        "G4", "B4", "E5", null, "D5", null, "B4", null,
        "D5", null, "B4", "A4", "G4", null, "D5", null
      ]
    },
    {
      id: "oldie",
      title: "Oldie Goldie",
      sub: "swing · feel-good",
      duration: 151,
      durationLabel: "2:31",
      label: "#2e6f68",
      ink: "#f4fbf7",
      bpm: 96,
      key: "F major",
      mood: "golden hour",
      spin: 1.55,
      swing: 0.18,
      style: "swing",
      bars: [
        { chord: ["F3", "A3", "C4", "E4"], bass: "F2" },
        { chord: ["D3", "F3", "A3", "C4"], bass: "D2" },
        { chord: ["G3", "Bb3", "D4", "F4"], bass: "G2" },
        { chord: ["C3", "E3", "G3", "Bb3"], bass: "C2" }
      ],
      melody: [
        "A4", "C5", "F5", "E5", "C5", "A4", "G4", null,
        "F4", "A4", "D5", "C5", "A4", null, "F4", null,
        "G4", "Bb4", "D5", "F5", "D5", "Bb4", "G4", null,
        "C5", "E5", "G5", "Bb5", "G5", "E5", "C5", null
      ]
    }
  ];

  class Turntable {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.analyser = null;
      this.musicBus = null;
      this.reverbSend = null;
      this.delaySend = null;
      this.crackleGain = null;
      this._crackleSource = null;
      this._noiseBuffer = null;
      this._timer = null;
      this.playing = false;
      this.trackIndex = 0;
      this.speed = 33;
      this.volume = 0.7;
      this.step = 0;
      this.nextTime = 0;
    }

    get track() {
      return TRACKS[this.trackIndex] || TRACKS[0];
    }

    /* ---------- setup ---------- */

    ensure() {
      if (this.ctx) return this.ctx;

      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error("Web Audio is not supported in this browser.");

      const ctx = new Ctx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.volume;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 22;
      compressor.ratio.value = 3.2;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.28;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;

      master.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(ctx.destination);
      this.master = master;
      this.analyser = analyser;

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.92;
      musicBus.connect(master);
      this.musicBus = musicBus;

      /* reverb */
      const reverb = ctx.createConvolver();
      reverb.buffer = this._makeImpulse(1.9, 2.6);
      const reverbWet = ctx.createGain();
      reverbWet.gain.value = 0.3;
      reverb.connect(reverbWet);
      reverbWet.connect(master);
      this.reverbSend = ctx.createGain();
      this.reverbSend.gain.value = 0.72;
      this.reverbSend.connect(reverb);

      /* tape delay */
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.335;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.26;
      const damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = 1900;
      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.17;
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      delay.connect(delayWet);
      delayWet.connect(master);
      this.delaySend = ctx.createGain();
      this.delaySend.gain.value = 0.55;
      this.delaySend.connect(delay);

      this._noiseBuffer = this._makeNoise(2);

      /* vinyl crackle */
      const crackleBuffer = this._makeCrackle(4);
      const source = ctx.createBufferSource();
      source.buffer = crackleBuffer;
      source.loop = true;
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 260;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 5200;
      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0;
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(crackleGain);
      crackleGain.connect(master);
      source.start();
      this._crackleSource = source;
      this.crackleGain = crackleGain;

      return ctx;
    }

    _makeNoise(seconds) {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    _makeImpulse(seconds, decay) {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * seconds);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return impulse;
    }

    _makeCrackle(seconds) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const length = Math.floor(rate * seconds);
      const buffer = ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.011;
      }

      const popCount = Math.floor(seconds * 7);
      for (let p = 0; p < popCount; p++) {
        const start = Math.floor(Math.random() * (length - 40));
        const amp = 0.06 + Math.random() * 0.2;
        const popLength = 2 + Math.floor(Math.random() * 5);
        for (let i = 0; i < popLength; i++) {
          data[start + i] += (Math.random() * 2 - 1) * amp * (1 - i / popLength);
        }
      }
      return buffer;
    }

    /* ---------- transport ---------- */

    async play() {
      this.ensure();
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      if (this.playing) return;

      this.playing = true;
      const now = this.ctx.currentTime;
      if (this.crackleGain) {
        this.crackleGain.gain.cancelScheduledValues(now);
        this.crackleGain.gain.setTargetAtTime(0.5, now, 0.25);
      }
      this.nextTime = now + 0.1;
      this._needleDrop(this.nextTime);
      this._scheduler();
      this._timer = setInterval(() => this._scheduler(), 25);
    }

    pause() {
      if (!this.playing) return;
      this.playing = false;
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
      if (this.ctx && this.crackleGain) {
        const now = this.ctx.currentTime;
        this.crackleGain.gain.cancelScheduledValues(now);
        this.crackleGain.gain.setTargetAtTime(0, now, 0.12);
      }
    }

    setTrack(index) {
      this.pause();
      this.trackIndex = Math.max(0, Math.min(TRACKS.length - 1, index));
      this.step = 0;
      this.nextTime = this.ctx ? this.ctx.currentTime + 0.1 : 0;
    }

    setSpeed(speed) {
      this.speed = speed === 45 ? 45 : 33;
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, value));
      if (this.ctx && this.master) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this.volume, now, 0.04);
      }
    }

    getAnalyser() {
      return this.analyser;
    }

    _stepDuration() {
      const factor = this.speed === 45 ? 1.14 : 1;
      return (60 / this.track.bpm / 2) / factor;
    }

    _scheduler() {
      if (!this.playing || !this.ctx) return;
      const lookahead = 0.16;
      while (this.nextTime < this.ctx.currentTime + lookahead) {
        this._scheduleStep(this.step, this.nextTime);
        this.nextTime += this._stepDuration();
        this.step += 1;
      }
    }

    _scheduleStep(step, time) {
      const track = this.track;
      const bar = track.bars[Math.floor(step / 8) % track.bars.length];
      const inBar = step % 8;
      const swing = track.swing ? (inBar % 2 ? this._stepDuration() * track.swing : 0) : 0;
      const t = time + swing;
      const barDuration = (60 / track.bpm) * 4 / (this.speed === 45 ? 1.14 : 1);

      /* chords — a soft Rhodes bed */
      if (inBar === 0) {
        const chordGain = track.style === "dream" ? 0.03 : 0.032;
        bar.chord.forEach((note) => {
          this._rhodes(noteToHz(note), t, barDuration * 0.94, chordGain);
        });
      }

      if (inBar === 4) {
        const high = bar.chord[bar.chord.length - 1];
        this._rhodes(noteToHz(high), t, barDuration * 0.34, 0.012);
      }

      /* bass */
      if (inBar === 0 || inBar === 4) {
        this._bass(noteToHz(bar.bass), t, inBar === 0 ? 0.55 : 0.38, 0.085);
      }

      /* drums */
      if (track.style === "dream") {
        if (inBar === 0 || inBar === 5) this._kick(t, 0.16);
        if (inBar === 4) this._snare(t, 0.035);
      } else if (track.style === "swing") {
        if (inBar === 0 || inBar === 5) this._kick(t, 0.24);
        if (inBar === 2 || inBar === 6) this._snare(t, 0.085);
      } else {
        if (inBar === 0 || inBar === 4) this._kick(t, 0.22);
        if (inBar === 2 || inBar === 6) this._snare(t, 0.075);
      }

      const hatLevel = inBar % 2 === 0 ? 0.026 : 0.014;
      this._hat(t + (inBar % 2 ? 0.012 : 0), hatLevel);

      /* melody */
      const note = track.melody[step % track.melody.length];
      if (note) {
        const level = track.style === "dream" ? 0.033 : 0.04;
        this._lead(noteToHz(note), t, barDuration * 0.2, level);
      }
    }

    /* ---------- voices ---------- */

    _rhodes(freq, time, duration, level) {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.min(3400, freq * 9);
      filter.Q.value = 0.5;

      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = freq * 2;
      osc2.detune.value = 5;

      const osc3 = ctx.createOscillator();
      osc3.type = "triangle";
      osc3.frequency.value = freq;
      osc3.detune.value = -4;

      const partial = ctx.createGain();
      partial.gain.value = 0.18;
      const body = ctx.createGain();
      body.gain.value = 0.1;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.018);
      gain.gain.exponentialRampToValueAtTime(Math.max(level * 0.46, 0.0002), time + Math.min(0.55, duration * 0.45));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc1.connect(filter);
      osc2.connect(partial);
      partial.connect(filter);
      osc3.connect(body);
      body.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      gain.connect(this.reverbSend);
      gain.connect(this.delaySend);

      const stopAt = time + duration + 0.06;
      [osc1, osc2, osc3].forEach((osc) => {
        osc.start(time);
        osc.stop(stopAt);
      });
    }

    _bass(freq, time, duration, level) {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 430;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = freq;
      osc2.detune.value = 6;

      const second = ctx.createGain();
      second.gain.value = 0.25;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.025);
      gain.gain.exponentialRampToValueAtTime(Math.max(level * 0.4, 0.0002), time + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      osc2.connect(second);
      second.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);

      const stopAt = time + duration + 0.05;
      osc.start(time);
      osc.stop(stopAt);
      osc2.start(time);
      osc2.stop(stopAt);
    }

    _lead(freq, time, duration, level) {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2600;

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = freq * 2;
      shimmer.detune.value = 7;

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.16;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(Math.max(level * 0.3, 0.0002), time + duration * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.18);

      osc.connect(filter);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      gain.connect(this.reverbSend);
      gain.connect(this.delaySend);

      const stopAt = time + duration + 0.24;
      osc.start(time);
      osc.stop(stopAt);
      shimmer.start(time);
      shimmer.stop(stopAt);
    }

    _kick(time, level) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(132, time);
      osc.frequency.exponentialRampToValueAtTime(44, time + 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);

      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(time);
      osc.stop(time + 0.38);
    }

    _snare(time, level) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      source.buffer = this._noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1750;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      gain.connect(this.reverbSend);
      source.start(time);
      source.stop(time + 0.2);
    }

    _hat(time, level) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      source.buffer = this._noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 7200;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(level, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      source.start(time);
      source.stop(time + 0.08);
    }

    _needleDrop(time) {
      const ctx = this.ctx;
      const source = ctx.createBufferSource();
      source.buffer = this._noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1650;
      filter.Q.value = 0.8;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicBus);
      source.start(time);
      source.stop(time + 0.22);

      const thump = ctx.createOscillator();
      thump.type = "sine";
      thump.frequency.setValueAtTime(96, time);
      thump.frequency.exponentialRampToValueAtTime(52, time + 0.12);
      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0001, time);
      thumpGain.gain.exponentialRampToValueAtTime(0.045, time + 0.01);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      thump.connect(thumpGain);
      thumpGain.connect(this.musicBus);
      thump.start(time);
      thump.stop(time + 0.24);
    }

    /* ---------- one-shots for the rest of the site ---------- */

    _unlock() {
      this.ensure();
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    _bell(freq, time) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = freq * 2.01;

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.14;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.035, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);

      osc.connect(gain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverbSend);

      osc.start(time);
      osc.stop(time + 0.95);
      shimmer.start(time);
      shimmer.stop(time + 0.95);
    }

    sparkle() {
      try {
        this._unlock();
        const t = this.ctx.currentTime + 0.02;
        ["C5", "E5", "G5", "B5", "D6"].forEach((note, index) => {
          this._bell(noteToHz(note), t + index * 0.075);
        });
      } catch (error) {
        /* sound is a bonus, never a blocker */
      }
    }

    whoosh() {
      try {
        this._unlock();
        const ctx = this.ctx;
        const time = ctx.currentTime + 0.01;
        const source = ctx.createBufferSource();
        source.buffer = this._noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(500, time);
        filter.frequency.exponentialRampToValueAtTime(2200, time + 0.35);
        filter.Q.value = 0.9;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        source.start(time);
        source.stop(time + 0.6);
      } catch (error) {
        /* no-op */
      }
    }
  }

  window.Turntable = Turntable;
  window.BIRTHDAY_TRACKS = TRACKS;
})();
