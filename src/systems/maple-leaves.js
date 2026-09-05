(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  const TWO_PI = Math.PI * 2;

  function makeLeafPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -1.08);
    ctx.bezierCurveTo(0.18, -0.8, 0.38, -1.02, 0.44, -0.62);
    ctx.bezierCurveTo(0.78, -0.82, 0.62, -0.36, 0.98, -0.18);
    ctx.bezierCurveTo(0.68, -0.02, 0.9, 0.22, 0.62, 0.34);
    ctx.bezierCurveTo(0.82, 0.66, 0.36, 0.5, 0.24, 1.03);
    ctx.bezierCurveTo(0.06, 0.72, -0.06, 0.72, -0.24, 1.03);
    ctx.bezierCurveTo(-0.36, 0.5, -0.82, 0.66, -0.62, 0.34);
    ctx.bezierCurveTo(-0.9, 0.22, -0.68, -0.02, -0.98, -0.18);
    ctx.bezierCurveTo(-0.62, -0.36, -0.78, -0.82, -0.44, -0.62);
    ctx.bezierCurveTo(-0.38, -1.02, -0.18, -0.8, 0, -1.08);
    ctx.closePath();
  }

  function drawLeaf(ctx, leaf) {
    const half = leaf.size * 0.5;
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotation);
    ctx.scale(half, half);

    const grad = ctx.createLinearGradient(-0.2, -1.1, 0.3, 1.15);
    grad.addColorStop(0, leaf.topColor);
    grad.addColorStop(0.55, leaf.midColor);
    grad.addColorStop(1, leaf.bottomColor);

    ctx.shadowColor = leaf.shadowColor;
    ctx.shadowBlur = 14 * leaf.glow;
    ctx.fillStyle = grad;
    makeLeafPath(ctx);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.08;
    ctx.strokeStyle = "rgba(255, 245, 240, 0.26)";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -0.94);
    ctx.lineTo(0, 1.02);
    ctx.strokeStyle = "rgba(255, 245, 240, 0.28)";
    ctx.lineWidth = 0.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -0.42);
    ctx.lineTo(0.36, -0.14);
    ctx.moveTo(0, -0.16);
    ctx.lineTo(-0.38, 0.1);
    ctx.moveTo(0, 0.08);
    ctx.lineTo(0.36, 0.4);
    ctx.moveTo(0, 0.3);
    ctx.lineTo(-0.33, 0.58);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 0.04;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 1.02);
    ctx.lineTo(0, 1.38);
    ctx.strokeStyle = "rgba(255, 208, 177, 0.35)";
    ctx.lineWidth = 0.08;
    ctx.stroke();

    ctx.restore();
  }

  window.BirthdaySite.createMapleLeaves = function createMapleLeaves(options) {
    const canvas = options.canvas;
    if (!canvas) {
      return {
        resize() {},
        seed() {},
        start() {},
        stop() {},
      };
    }

    const ctx = canvas.getContext("2d");
    const state = options.state || { reducedMotion: false };
    const ambientConfig = (options.config && options.config.ambient) || {};
    const leaves = [];
    const stars = [];
    const meteors = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let lastTime = 0;
    let nextMeteorAt = 0;

    const useLeaves = ambientConfig.mapleLeaves !== false;
    const useStars = ambientConfig.starfield !== false;
    const useMeteors = ambientConfig.meteors !== false;

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function spawnStar() {
      const roll = Math.random();
      const tint = roll < 0.44 ? "255, 230, 246" : roll < 0.82 ? "190, 224, 255" : "255, 225, 172";
      return {
        x: random(0, width || window.innerWidth),
        y: random(0, height || window.innerHeight),
        radius: random(0.42, 1.85),
        alpha: random(0.18, 0.84),
        phase: random(0, TWO_PI),
        twinkle: random(0.0012, 0.0034),
        drift: random(0.08, 0.38),
        tint,
      };
    }

    function seedStars() {
      stars.length = 0;
      if (!useStars) return;

      const area = Math.max(width * height, 320000);
      const total = state.reducedMotion
        ? Math.min(64, Math.floor(area / 21000))
        : Math.min(176, Math.floor(area / 8200));
      for (let i = 0; i < total; i += 1) {
        stars.push(spawnStar());
      }
    }

    function spawnLeaf(initial) {
      const hue = Math.random();
      const palette =
        hue < 0.34
          ? {
              topColor: "rgba(255, 214, 214, 0.94)",
              midColor: "rgba(219, 94, 130, 0.88)",
              bottomColor: "rgba(125, 37, 78, 0.82)",
              shadowColor: "rgba(241, 101, 151, 0.28)",
            }
          : hue < 0.67
            ? {
                topColor: "rgba(255, 210, 176, 0.96)",
                midColor: "rgba(231, 128, 92, 0.92)",
                bottomColor: "rgba(143, 54, 38, 0.84)",
                shadowColor: "rgba(255, 173, 112, 0.3)",
              }
            : {
                topColor: "rgba(251, 188, 203, 0.94)",
                midColor: "rgba(195, 71, 118, 0.9)",
                bottomColor: "rgba(99, 31, 67, 0.82)",
                shadowColor: "rgba(229, 100, 159, 0.3)",
              };

      return {
        x: initial ? random(0, width || window.innerWidth) : random(-120, width + 120),
        y: initial ? random(-height, height) : random(-120, -20),
        size: random(32, 84),
        speed: random(0.16, 0.62),
        drift: random(0.12, 0.54),
        rotation: random(0, Math.PI * 2),
        spin: random(-0.004, 0.004),
        sway: random(0.6, 1.8),
        phase: random(0, Math.PI * 2),
        glow: random(0.7, 1.15),
        topColor: palette.topColor,
        midColor: palette.midColor,
        bottomColor: palette.bottomColor,
        shadowColor: palette.shadowColor,
      };
    }

    function spawnMeteor(offset) {
      const compact = width < 720;
      const fromLeft = Math.random() > 0.28;
      const speed = random(9.8, 16.4) * (compact ? 0.72 : 1);
      const direction = fromLeft ? 1 : -1;
      const startX = fromLeft ? random(-280, width * 0.68) : random(width * 0.32, width + 280);
      const startY = random(-height * 0.08, height * 0.28) - offset;
      const length = random(210, 430) * (compact ? 0.76 : 1);
      const sparkles = Array.from({ length: 7 }, () => ({
        offset: random(0.16, 0.88),
        spread: random(-12, 12),
        radius: random(0.6, 1.6),
        phase: random(0, TWO_PI),
      }));

      return {
        x: startX,
        y: startY,
        vx: direction * speed,
        vy: speed * random(0.38, 0.54),
        length,
        width: random(1.1, 2.4),
        life: 0,
        maxLife: random(64, 104),
        alpha: random(0.62, 0.94),
        warm: Math.random() > 0.55,
        tone: Math.random(),
        sparkles,
      };
    }

    function scheduleMeteor(time) {
      const isFeatureMoment = state.currentScreen === "passwordScreen" || state.currentScreen === "countdownScreen";
      nextMeteorAt = time + (isFeatureMoment ? random(680, 1580) : random(2000, 4600));
    }

    function seed() {
      leaves.length = 0;
      meteors.length = 0;
      seedStars();

      if (useLeaves) {
        const total = state.reducedMotion ? 10 : 26;
        for (let i = 0; i < total; i += 1) {
          leaves.push(spawnLeaf(true));
        }
      }
      nextMeteorAt = 0;
    }

    function resize() {
      const previousWidth = width || window.innerWidth || 1;
      const previousHeight = height || window.innerHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.forEach((star) => {
        star.x = (star.x / previousWidth) * width;
        star.y = (star.y / previousHeight) * height;
      });
    }

    function drawBackdrop(time) {
      const breath = 0.5 + Math.sin(time * 0.00012) * 0.5;
      const x1 = width * (0.18 + breath * 0.06);
      const y1 = height * (0.18 + Math.cos(time * 0.00009) * 0.04);
      const x2 = width * (0.82 - breath * 0.04);
      const y2 = height * (0.74 + Math.sin(time * 0.00011) * 0.05);

      const night = ctx.createLinearGradient(0, 0, 0, height);
      night.addColorStop(0, "#030b20");
      night.addColorStop(0.48, "#101936");
      night.addColorStop(0.72, "#241127");
      night.addColorStop(1, "#10070d");
      ctx.fillStyle = night;
      ctx.fillRect(0, 0, width, height);

      const glow1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, Math.max(width, height) * 0.8);
      glow1.addColorStop(0, "rgba(255, 128, 170, 0.22)");
      glow1.addColorStop(0.36, "rgba(255, 128, 170, 0.12)");
      glow1.addColorStop(1, "rgba(255, 128, 170, 0)");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      const glow2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, Math.max(width, height) * 0.9);
      glow2.addColorStop(0, "rgba(245, 176, 119, 0.18)");
      glow2.addColorStop(0.32, "rgba(245, 176, 119, 0.08)");
      glow2.addColorStop(1, "rgba(245, 176, 119, 0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      const veil = ctx.createLinearGradient(0, 0, 0, height);
      veil.addColorStop(0, "rgba(255,255,255,0.04)");
      veil.addColorStop(0.5, "rgba(255,255,255,0.015)");
      veil.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);

      const horizon = ctx.createLinearGradient(0, height * 0.72, 0, height);
      horizon.addColorStop(0, "rgba(83, 122, 190, 0)");
      horizon.addColorStop(0.52, "rgba(83, 122, 190, 0.07)");
      horizon.addColorStop(1, "rgba(255, 118, 175, 0.09)");
      ctx.fillStyle = horizon;
      ctx.fillRect(0, height * 0.72, width, height * 0.28);
    }

    function drawStars(time) {
      if (!useStars || !stars.length) return;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      stars.forEach((star) => {
        const pulse = 0.64 + Math.sin(time * star.twinkle + star.phase) * 0.36;
        const alpha = Math.max(0.08, star.alpha * pulse);
        const x = star.x + Math.sin(time * 0.00012 + star.phase) * star.drift;
        const y = star.y + Math.cos(time * 0.0001 + star.phase) * star.drift;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${star.tint}, ${alpha})`;
        ctx.shadowColor = `rgba(${star.tint}, ${alpha * 0.58})`;
        ctx.shadowBlur = star.radius > 1.1 ? 10 : 4;
        ctx.arc(x, y, star.radius * pulse, 0, TWO_PI);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawMeteor(meteor, time) {
      const velocityLength = Math.hypot(meteor.vx, meteor.vy) || 1;
      const nx = meteor.vx / velocityLength;
      const ny = meteor.vy / velocityLength;
      const tailX = meteor.x - nx * meteor.length;
      const tailY = meteor.y - ny * meteor.length;
      const fadeIn = Math.min(1, meteor.life / 18);
      const fadeOut = Math.min(1, (meteor.maxLife - meteor.life) / 28);
      const fade = Math.max(0, Math.min(fadeIn, fadeOut));
      const alpha = meteor.alpha * fade;
      const core = meteor.tone < 0.42 ? "255, 255, 255" : meteor.warm ? "255, 223, 163" : "255, 215, 235";
      const rose = meteor.tone < 0.42 ? "180, 224, 255" : meteor.warm ? "255, 154, 124" : "255, 86, 166";

      if (alpha <= 0) return;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = `rgba(${rose}, ${alpha * 0.78})`;
      ctx.shadowBlur = 26;

      const trail = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
      trail.addColorStop(0, `rgba(${rose}, 0)`);
      trail.addColorStop(0.44, `rgba(${rose}, ${alpha * 0.14})`);
      trail.addColorStop(0.82, `rgba(${rose}, ${alpha * 0.48})`);
      trail.addColorStop(1, `rgba(${core}, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(meteor.x, meteor.y);
      ctx.strokeStyle = trail;
      ctx.lineWidth = meteor.width * fade;
      ctx.stroke();

      const head = ctx.createRadialGradient(meteor.x, meteor.y, 0, meteor.x, meteor.y, 24 * fade);
      head.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      head.addColorStop(0.24, `rgba(${core}, ${alpha * 0.82})`);
      head.addColorStop(1, `rgba(${rose}, 0)`);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(meteor.x, meteor.y, 24 * fade, 0, TWO_PI);
      ctx.fill();

      meteor.sparkles.forEach((sparkle) => {
        const flicker = 0.55 + Math.sin(time * 0.011 + sparkle.phase) * 0.45;
        const sparkleAlpha = alpha * flicker * 0.42;
        const px = meteor.x - nx * meteor.length * sparkle.offset - ny * sparkle.spread;
        const py = meteor.y - ny * meteor.length * sparkle.offset + nx * sparkle.spread;

        ctx.beginPath();
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${rose}, ${sparkleAlpha})`;
        ctx.arc(px, py, sparkle.radius * fade * flicker, 0, TWO_PI);
        ctx.fill();
      });

      ctx.restore();
    }

    function updateMeteors(time, dt) {
      if (!useMeteors || state.reducedMotion) return;

      if (!nextMeteorAt) {
        scheduleMeteor(time);
      }

      if (time >= nextMeteorAt) {
        const isFeatureMoment = state.currentScreen === "passwordScreen" || state.currentScreen === "countdownScreen";
        const count = isFeatureMoment
          ? (Math.random() > 0.62 ? 2 + Math.floor(Math.random() * 2) : 1)
          : (Math.random() > 0.82 ? 2 : 1);
        for (let i = 0; i < count; i += 1) {
          meteors.push(spawnMeteor(i * random(22, 64)));
        }
        scheduleMeteor(time);
      }

      for (let i = meteors.length - 1; i >= 0; i -= 1) {
        const meteor = meteors[i];
        meteor.life += dt;
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;

        drawMeteor(meteor, time);

        const isOut =
          meteor.life > meteor.maxLife ||
          meteor.x < -meteor.length - 120 ||
          meteor.x > width + meteor.length + 120 ||
          meteor.y > height + meteor.length + 120;
        if (isOut) {
          meteors.splice(i, 1);
        }
      }
    }

    function step(time) {
      if (!running) return;
      const dt = lastTime ? Math.min((time - lastTime) / 16.7, 2.4) : 1;
      lastTime = time;

      drawBackdrop(time);
      drawStars(time);
      updateMeteors(time, dt);

      ctx.globalCompositeOperation = "lighter";
      leaves.forEach((leaf, index) => {
        const driftWave = Math.sin(time * 0.00075 * leaf.sway + leaf.phase);
        leaf.y += leaf.speed * (state.reducedMotion ? 0.45 : 1) * dt;
        leaf.x += leaf.drift * driftWave * dt;
        leaf.rotation += (leaf.spin + Math.sin(time * 0.00055 + leaf.phase) * 0.0012) * dt;

        if (leaf.y - leaf.size > height + 40) {
          Object.assign(leaf, spawnLeaf(false));
          leaf.y = -random(80, 220);
        }
        if (leaf.x < -160) leaf.x = width + 160;
        if (leaf.x > width + 160) leaf.x = -160;

        const wobble = 1 + Math.sin(time * 0.0013 + leaf.phase) * 0.08;
        leaf.glow = 0.88 + Math.sin(time * 0.0018 + index) * 0.12;
        drawLeaf(ctx, {
          ...leaf,
          rotation: leaf.rotation + driftWave * 0.04,
          size: leaf.size * wobble,
        });
      });
      ctx.globalCompositeOperation = "source-over";

      raf = window.requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      lastTime = 0;
      resize();
      if (!leaves.length) seed();
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      lastTime = 0;
      ctx.clearRect(0, 0, width, height);
    }

    return {
      resize,
      seed,
      start,
      stop,
    };
  };
})();
