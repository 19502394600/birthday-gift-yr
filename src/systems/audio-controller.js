(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  window.BirthdaySite.createAudioController = function createAudioController(config, dom, state) {
    let ctx;
    let bgm;
    let enabled = false;
    let lastFilmAt = 0;
    let fadeTimer = 0;

    function ensureContext() {
      if (!ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) ctx = new AudioContext();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
    }

    function fadeBgmTo(target, duration, done) {
      if (!bgm) return;
      clearInterval(fadeTimer);
      const start = bgm.volume;
      const startedAt = performance.now();

      fadeTimer = setInterval(() => {
        const progress = Math.min((performance.now() - startedAt) / duration, 1);
        bgm.volume = start + (target - start) * progress;
        if (progress >= 1) {
          clearInterval(fadeTimer);
          if (done) done();
        }
      }, 30);
    }

    function unlock() {
      ensureContext();
      enabled = true;
      state.audioUnlocked = true;
      dom.soundLabel.textContent = config.music.background ? "声音已开" : "音效已开";

      if (config.music.background && !bgm) {
        bgm = new Audio(config.music.background);
        bgm.loop = true;
        bgm.volume = 0;
        bgm.play().catch(() => {
          dom.soundLabel.textContent = "点我开声";
        });
        fadeBgmTo(0.22, 900);
      } else if (bgm) {
        bgm.play().catch(() => {});
        fadeBgmTo(0.22, 500);
      }
    }

    function setEnabled(next) {
      if (next) {
        unlock();
        return;
      }

      enabled = false;
      dom.soundLabel.textContent = "开启声音";
      if (bgm) fadeBgmTo(0, 260, () => bgm.pause());
    }

    function tone(freq, duration, type, gain) {
      if (!enabled || !ctx) return;
      const osc = ctx.createOscillator();
      const volume = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq || 440;
      volume.gain.setValueAtTime(0, ctx.currentTime);
      volume.gain.linearRampToValueAtTime(gain || 0.08, ctx.currentTime + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.12));
      osc.connect(volume).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration || 0.12) + 0.02);
    }

    function chime() {
      tone(523.25, 0.16, "sine", 0.08);
      setTimeout(() => tone(659.25, 0.16, "sine", 0.07), 80);
      setTimeout(() => tone(783.99, 0.22, "triangle", 0.06), 170);
    }

    function film() {
      const now = performance.now();
      if (now - lastFilmAt < 220) return;
      lastFilmAt = now;
      tone(140, 0.055, "square", 0.04);
      setTimeout(() => tone(220, 0.05, "triangle", 0.035), 58);
    }

    function transition() {
      tone(196, 0.16, "triangle", 0.045);
      setTimeout(() => tone(392, 0.2, "sine", 0.035), 80);
    }

    function videoMode(active) {
      if (!bgm) return;
      fadeBgmTo(active ? 0.04 : 0.22, active ? 520 : 760);
    }

    return {
      unlock,
      setEnabled,
      tone,
      chime,
      film,
      transition,
      videoMode,
      get enabled() {
        return enabled;
      },
    };
  };
})();
