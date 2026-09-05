(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  window.BirthdaySite.createCountdown = function createCountdown(options) {
    const canvas = options.canvas;
    const ctx = canvas.getContext("2d");
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");
    let particles = [];
    let shockwaves = [];
    let raf = 0;
    let currentNumber = 5;
    let started = false;
    let finished = false;
    let finishTimer = 0;
    let numberStartedAt = 0;
    let lastBeatAt = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeTargets(number) {
      const w = 560;
      const h = 420;
      offscreen.width = w;
      offscreen.height = h;
      offCtx.clearRect(0, 0, w, h);
      offCtx.fillStyle = "#ffffff";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.font = "800 318px Georgia";
      offCtx.fillText(String(number), w / 2, h / 2 + 12);

      const image = offCtx.getImageData(0, 0, w, h).data;
      const targets = [];
      const step = options.state.reducedMotion ? 16 : 8;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const alpha = image[(y * w + x) * 4 + 3];
          if (alpha > 70) {
            const jitter = Math.random() * 1.8;
            targets.push({ x: x - w / 2 + jitter, y: y - h / 2 + jitter });
          }
        }
      }

      return targets;
    }

    function addShockwave() {
      const rect = canvas.getBoundingClientRect();
      shockwaves.push({
        x: rect.width / 2,
        y: rect.height / 2,
        radius: 20,
        alpha: 0.46,
        width: 3,
      });
    }

    function setNumber(number) {
      currentNumber = number;
      numberStartedAt = performance.now();
      lastBeatAt = numberStartedAt;
      const targets = makeTargets(number);
      const rect = canvas.getBoundingClientRect();
      const count = Math.min(targets.length, options.state.reducedMotion ? 120 : 420);
      const scale = Math.min(rect.width / 760, rect.height / 520, 1.05);

      particles = Array.from({ length: count }, (_, index) => {
        const target = targets[Math.floor((index / count) * targets.length)];
        const old = particles[index];
        const burstAngle = Math.random() * Math.PI * 2;
        const orbit = 70 + Math.random() * 260;

        return {
          x: old ? old.x : rect.width / 2 + Math.cos(burstAngle) * orbit,
          y: old ? old.y : rect.height / 2 + Math.sin(burstAngle) * orbit,
          tx: rect.width / 2 + target.x * scale,
          ty: rect.height / 2 - 42 + target.y * scale,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          phase: Math.random() * Math.PI * 2,
          size: 2.1 + Math.random() * 3.8,
          magnet: 0.026 + Math.random() * 0.018,
          friction: 0.76 + Math.random() * 0.08,
        };
      });

      addShockwave();
      options.audio.tone(164 + (6 - number) * 54, 0.18, "triangle", 0.065);
      window.setTimeout(() => options.audio.tone(98 + (6 - number) * 32, 0.08, "sine", 0.035), 70);
      if (options.cakeScene && number <= 3) options.cakeScene.show();
    }

    function drawShockwaves() {
      shockwaves = shockwaves.filter((wave) => wave.alpha > 0.01);
      shockwaves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 132, 190, ${wave.alpha})`;
        ctx.lineWidth = wave.width;
        ctx.shadowColor = "rgba(255, 102, 177, 0.62)";
        ctx.shadowBlur = 28;
        ctx.arc(wave.x, wave.y - 40, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        wave.radius += options.state.reducedMotion ? 2.8 : 7.2;
        wave.alpha *= options.state.reducedMotion ? 0.92 : 0.88;
        wave.width += 0.24;
      });
      ctx.shadowBlur = 0;
    }

    function drawNumberAura(rect, time) {
      const elapsed = Math.max(0, time - numberStartedAt);
      const beat = Math.max(0, 1 - elapsed / 520);
      const pulse = 0.5 + Math.sin(time * 0.007) * 0.5;
      const cx = rect.width / 2;
      const cy = rect.height / 2 - 42;

      const aura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 310 + beat * 110);
      aura.addColorStop(0, `rgba(255, 153, 207, ${0.18 + beat * 0.16})`);
      aura.addColorStop(0.32, `rgba(255, 96, 176, ${0.12 + pulse * 0.04})`);
      aura.addColorStop(1, "rgba(255, 96, 176, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(cx, cy + 210);
      ctx.scale(1, 0.16);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 125, 180, ${0.08 + pulse * 0.04})`;
      ctx.shadowColor = "rgba(255, 124, 184, 0.5)";
      ctx.shadowBlur = 34;
      ctx.arc(0, 0, 260 + beat * 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function loop(time) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawNumberAura(rect, time);
      drawShockwaves();

      const elapsed = Math.max(0, time - numberStartedAt);
      const beat = Math.max(0, 1 - elapsed / 600);
      const rhythm = 1 + Math.sin(elapsed * 0.012) * 0.08 + beat * 0.28;

      if (!options.state.reducedMotion && time - lastBeatAt > 420 && !finished) {
        lastBeatAt = time;
        shockwaves.push({
          x: rect.width / 2,
          y: rect.height / 2,
          radius: 80,
          alpha: 0.16,
          width: 2,
        });
      }

      ctx.globalCompositeOperation = "lighter";
      particles.forEach((p, index) => {
        const wave = Math.sin(time * 0.008 + p.phase);
        const orbit = Math.cos(time * 0.0025 + p.phase) * 1.8;
        p.vx += (p.tx - p.x) * p.magnet + Math.cos(p.phase + time * 0.002) * 0.08;
        p.vy += (p.ty - p.y) * p.magnet + Math.sin(p.phase + time * 0.002) * 0.08;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;

        const twinkle = 0.58 + Math.sin(time * 0.01 + p.phase) * 0.38;
        const size = p.size * rhythm * (0.88 + twinkle * 0.24);
        const x = p.x + orbit;
        const y = p.y + wave * 3.5;
        const isCore = index % 6 !== 0;

        ctx.beginPath();
        ctx.fillStyle = isCore
          ? `rgba(255, 154, 205, ${0.52 + twinkle * 0.38})`
          : `rgba(255, 232, 245, ${0.48 + twinkle * 0.35})`;
        ctx.shadowColor = "rgba(255, 109, 184, 0.82)";
        ctx.shadowBlur = 11 + beat * 16;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        if (index % 24 === 0 && !options.state.reducedMotion) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 214, 234, ${0.14 + twinkle * 0.12})`;
          ctx.lineWidth = 1;
          ctx.arc(x, y, size * 3.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    }

    function scheduleNext() {
      clearTimeout(finishTimer);
      if (currentNumber <= 1) {
        finishTimer = setTimeout(finish, options.state.reducedMotion ? 520 : 1320);
        return;
      }

      finishTimer = setTimeout(() => {
        setNumber(currentNumber - 1);
        scheduleNext();
      }, options.state.reducedMotion ? 520 : 1260);
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(finishTimer);
      addShockwave();
      addShockwave();

      const rect = canvas.getBoundingClientRect();
      particles.forEach((p) => {
        const angle = Math.atan2(p.y - rect.height / 2, p.x - rect.width / 2) + (Math.random() - 0.5) * 1.4;
        const force = 80 + Math.random() * 340;
        p.tx = rect.width / 2 + Math.cos(angle) * force;
        p.ty = rect.height / 2 + Math.sin(angle) * force;
        p.vx += Math.cos(angle) * (6 + Math.random() * 14);
        p.vy += Math.sin(angle) * (6 + Math.random() * 14);
        p.size *= 0.88;
      });

      options.audio.chime();
      window.setTimeout(() => {
        if (options.cakeScene) options.cakeScene.reveal();
        options.birthdayReveal.classList.add("is-visible");
        if (options.skipButton) options.skipButton.classList.add("is-hidden");
      }, options.state.reducedMotion ? 120 : 360);
    }

    function start() {
      if (started && !finished) return;
      started = true;
      finished = false;
      currentNumber = 5;
      resize();
      if (options.cakeScene) options.cakeScene.hide();
      options.birthdayReveal.classList.remove("is-visible");
      if (options.skipButton) options.skipButton.classList.remove("is-hidden");
      setNumber(5);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      scheduleNext();
    }

    function skip() {
      if (!started) start();
      finish();
    }

    function stopPreview() {
      clearTimeout(finishTimer);
      cancelAnimationFrame(raf);
      started = false;
    }

    function reset() {
      clearTimeout(finishTimer);
      cancelAnimationFrame(raf);
      particles = [];
      shockwaves = [];
      started = false;
      finished = false;
      currentNumber = 5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      options.birthdayReveal.classList.remove("is-visible");
      if (options.skipButton) options.skipButton.classList.remove("is-hidden");
    }

    return {
      start,
      skip,
      resize,
      stopPreview,
      reset,
    };
  };
})();
