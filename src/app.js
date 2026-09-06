(function () {
  const config = window.BirthdayStory;
  const photoBase = "assets/photos/timeline-numbered/";
  const mobilePhotoBase = "assets/photos/timeline-mobile/";
  const mainMusicVolume = 0.38;
  const galleryDuckVolume = 0.14;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const appleMobile = /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  const appleDesktop = /Macintosh|Mac OS X/i.test(ua) && !appleMobile;
  const appleDevice = appleMobile || appleDesktop;
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
  const lowPowerDevice = appleMobile || reducedMotion || (!appleDesktop && ((deviceMemory > 0 && deviceMemory <= 4) || (hardwareConcurrency > 0 && hardwareConcurrency <= 4)));
  const useCountdownFallback = appleMobile;
  const pageTransitionMs = appleMobile ? 240 : appleDevice ? 420 : 360;

  if (appleMobile) document.documentElement.classList.add("ios-performance", "apple-device");
  else if (appleDesktop) document.documentElement.classList.add("apple-device", "apple-desktop");

  const state = {
    page: "loginPage",
    photoIndex: 0,
    meteorRevealMs: 0,
    meteorSubDelayMs: 0,
    meteorButtonTimer: null,
    countdownTimer: null,
    countdownRaf: 0,
    countdownController: null,
    countdownFrameReady: false,
    countdownStarted: false,
    countdownReadyAt: 0,
    countdownStartTimer: null,
    blessingDone: false,
    blessingTimer: null,
    fireworksTimer: null,
    lyricsActive: false,
    lyricIndex: -1,
    audioUnlocked: false,
    audioBlocked: false,
    lastRequestedMusicPage: "loginPage",
    countdownMusicPrimed: false,
    mainMusicPrimed: false,
    filmAudioCtx: null,
    projectorNodes: null,
    musicVolumeRaf: 0,
    musicDuckTimer: null,
    photoTransitioning: false,
    photoFlipTimer: null,
    pageTransitionTimer: null,
    countdownWarmTimer: null,
    countdownFallbackTimer: null,
    countdownFallbackRaf: 0,
    countdownFallbackStars: [],
    countdownFallbackPhase: 0,
    videosWarmTimer: null,
    videosRendered: false,
    fireworksWarmed: false,
    heartScatterTimer: null,
    heartContinueTimer: null,
    resizeTimer: null,
  };

  const pages = Array.from(document.querySelectorAll(".page"));
  const dom = {
    passwordInput: document.getElementById("passwordInput"),
    enterBtn: document.getElementById("enterBtn"),
    loginError: document.getElementById("loginError"),
    countdownMusic: document.getElementById("countdownMusic"),
    meteorAudio: document.getElementById("meteorAudio"),
    confessionMusic: document.getElementById("confessionMusic"),
    meteorVideo: document.getElementById("meteorVideo"),
    meteorTitle: document.getElementById("meteorTitle"),
    meteorSub: document.getElementById("meteorSub"),
    meteorNextBtn: document.getElementById("meteorNextBtn"),
    countdownFrame: document.getElementById("countdownFrame"),
    countdownFallback: document.getElementById("countdownFallback"),
    fallbackCountdownCanvas: document.getElementById("fallbackCountdownCanvas"),
    fallbackReadyText: document.getElementById("fallbackReadyText"),
    fallbackNumber: document.getElementById("fallbackNumber"),
    fallbackCake: document.getElementById("fallbackCake"),
    fallbackFinalText: document.getElementById("fallbackFinalText"),
    countdownNextBtn: document.getElementById("countdownNextBtn"),
    skipCountdownBtn: document.getElementById("skipCountdownBtn"),
    photoWindow: document.getElementById("photoWindow"),
    dazzCard: document.getElementById("dazzCard"),
    photoCounter: document.getElementById("photoCounter"),
    photoAge: document.getElementById("photoAge"),
    photoFileName: document.getElementById("photoFileName"),
    filmStrip: document.getElementById("filmStrip"),
    prevPhotoBtn: document.getElementById("prevPhotoBtn"),
    nextPhotoBtn: document.getElementById("nextPhotoBtn"),
    zoomPhotoBtn: document.getElementById("zoomPhotoBtn"),
    finishGalleryBtn: document.getElementById("finishGalleryBtn"),
    lightbox: document.getElementById("lightbox"),
    lightboxImg: document.getElementById("lightboxImg"),
    lightboxCaption: document.getElementById("lightboxCaption"),
    lightboxClose: document.getElementById("lightboxClose"),
    messageText: document.getElementById("messageText"),
    messageCursor: document.getElementById("messageCursor"),
    skipMessageBtn: document.getElementById("skipMessageBtn"),
    eggBtn: document.getElementById("eggBtn"),
    videoGrid: document.getElementById("videoGrid"),
    videoActions: document.getElementById("videoActions"),
    videosNextBtn: document.getElementById("videosNextBtn"),
    blessingPage: document.getElementById("blessingPage"),
    blessingCard: document.getElementById("blessingCard"),
    blessingText: document.getElementById("blessingText"),
    blessingCursor: document.getElementById("blessingCursor"),
    heartStartBtn: document.getElementById("heartStartBtn"),
    heartLayer: document.getElementById("heartLayer"),
    heartNextBtn: document.getElementById("heartNextBtn"),
    fireworksVideo: document.getElementById("fireworksVideo"),
    fireworksText: document.getElementById("fireworksText"),
    fireworksNextBtn: document.getElementById("fireworksNextBtn"),
    endingText: document.getElementById("endingText"),
    endingSky: document.getElementById("endingSky"),
    lyricsOverlay: document.getElementById("lyricsOverlay"),
    lyricsText: document.getElementById("lyricsText"),
  };

  function assetUrl(path) {
    return encodeURI(path);
  }

  function ensureMediaElementSource(media) {
    if (!media) return;
    if (media.currentSrc || media.getAttribute("src")) return;

    media.querySelectorAll("source").forEach((source) => {
      const sourcePath = source.getAttribute("data-src");
      if (sourcePath && !source.getAttribute("src")) source.setAttribute("src", assetUrl(sourcePath));
    });
    media.load();
  }

  function showPage(id) {
    const nextPage = document.getElementById(id);
    const previousPage = pages.find((page) => page.classList.contains("active"));
    if (!nextPage || (previousPage === nextPage && state.page === id)) return;

    window.clearTimeout(state.pageTransitionTimer);
    pages.forEach((page) => {
      if (page !== previousPage) page.classList.remove("page-leaving");
      if (page !== nextPage) page.classList.remove("page-entering");
    });

    if (previousPage && previousPage !== nextPage) {
      previousPage.classList.remove("active");
      previousPage.classList.add("page-leaving");
    }

    nextPage.classList.add("active", "page-entering");
    nextPage.scrollTop = 0;
    void nextPage.offsetWidth;
    window.requestAnimationFrame(() => nextPage.classList.remove("page-entering"));

    state.page = id;
    stopTransientWork(id);
    applyStageMusic(id);
    applyLyrics(id);

    if (previousPage && previousPage !== nextPage) {
      const releaseDelay = previousPage.id === "countdownPage" && id === "blessingPage"
        ? 120
        : reducedMotion ? 0 : pageTransitionMs + 40;
      state.pageTransitionTimer = window.setTimeout(() => {
        previousPage.classList.remove("page-leaving");
        releasePageResources(previousPage.id);
        state.pageTransitionTimer = null;
      }, releaseDelay);
    }

    if (id === "meteorPage") startMeteorPage();
    if (id === "countdownPage") startCountdown();
    if (id === "galleryPage") {
      renderPhoto();
      startProjectorSound();
      scheduleVideosWarm();
    }
    if (id === "messagePage") {
      renderBoardMessages();
      warmFireworksVideo();
    }
    if (id === "videosPage") startVideosPage();
    if (id === "blessingPage") startBlessingTypewriter();
    if (id === "heartPage") startHeartPopups();
    if (id === "finalFireworksPage") startFinalFireworks();
    if (id === "endingPage") {
      dom.endingText.textContent = config.endingText;
      startEndingSky();
    }
  }

  function stopTransientWork(nextId) {
    window.clearTimeout(state.countdownTimer);
    state.countdownTimer = null;
    window.clearTimeout(state.countdownStartTimer);
    state.countdownStartTimer = null;
    window.cancelAnimationFrame(state.countdownRaf);
    state.countdownRaf = 0;
    state.countdownController = null;
    window.clearTimeout(state.meteorButtonTimer);
    state.meteorButtonTimer = null;

    if (nextId !== "blessingPage") window.clearTimeout(state.blessingTimer);
    if (nextId !== "finalFireworksPage") {
      window.clearInterval(state.fireworksTimer);
      state.fireworksTimer = null;
    }
    if (nextId !== "meteorPage") pauseMeteorOriginal();
    if (nextId !== "countdownPage") {
      state.countdownStarted = false;
      postCountdownMessage("birthday-countdown:stop");
      stopFallbackCountdown();
    }
    if (nextId !== "finalFireworksPage" && dom.fireworksVideo) dom.fireworksVideo.pause();
    if (nextId !== "videosPage") pauseBlessingVideos();
    if (nextId !== "galleryPage") {
      window.clearTimeout(state.photoFlipTimer);
      state.photoFlipTimer = null;
      state.photoTransitioning = false;
      stopProjectorSound();
    }
    if (nextId !== "heartPage") clearHeartTimers();
    state.lyricsActive = false;
    state.lyricIndex = -1;
  }

  function releaseMediaElement(media) {
    if (!media) return;
    media.pause();
    media.removeAttribute("src");
    media.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
    media.load();
  }

  function releasePageResources(pageId) {
    if (pageId === "meteorPage") releaseMediaElement(dom.meteorVideo);

    if (pageId === "countdownPage" && dom.countdownFrame && dom.countdownFrame.dataset.loadState) {
      postCountdownMessage("birthday-countdown:dispose");
      window.setTimeout(() => {
        dom.countdownFrame.src = "about:blank";
        delete dom.countdownFrame.dataset.loadState;
        state.countdownFrameReady = false;
      }, 60);
    }

    if (pageId === "videosPage" && dom.videoGrid) {
      dom.videoGrid.querySelectorAll("video").forEach(releaseMediaElement);
    }

    if (pageId === "finalFireworksPage") releaseMediaElement(dom.fireworksVideo);
  }

  function prepareAudioElement(audio) {
    if (!audio) return;
    audio.preload = "auto";
    if (audio.readyState < 1 || !audio.currentSrc) {
      try {
        audio.load();
      } catch (_error) {}
    }
  }

  function primeMainMusic() {
    if (!dom.confessionMusic || state.mainMusicPrimed) return;
    state.mainMusicPrimed = true;
    prepareAudioElement(dom.confessionMusic);
  }

  function primeCountdownMusic() {
    if (!dom.countdownMusic || state.countdownMusicPrimed) return;
    state.countdownMusicPrimed = true;
    prepareAudioElement(dom.countdownMusic);
  }

  function resumeFilmAudioContext() {
    if (state.filmAudioCtx && state.filmAudioCtx.state === "suspended") {
      state.filmAudioCtx.resume().catch(() => {});
    }
  }

  function unlockAudio() {
    if (state.audioUnlocked) {
      resumeFilmAudioContext();
      return Promise.resolve();
    }
    state.audioUnlocked = true;
    resumeFilmAudioContext();
    return Promise.resolve();
  }

  function applyStageMusic(pageId) {
    state.lastRequestedMusicPage = pageId;
    if (!state.audioUnlocked) return;
    const countdownMusicPages = new Set(["countdownPage"]);
    const mainMusicPages = new Set(["blessingPage", "heartPage", "galleryPage", "videosPage", "messagePage", "finalFireworksPage", "endingPage"]);

    if (countdownMusicPages.has(pageId)) {
      pauseMeteorOriginal();
      pauseAudio(dom.confessionMusic);
      primeCountdownMusic();
      playAudio(dom.countdownMusic, "倒计时音乐", "把倒计时背景.m4a 放到 assets/music/countdown-background.m4a。");
      primeMainMusic();
      return;
    }

    pauseAudio(dom.countdownMusic);
    if (mainMusicPages.has(pageId)) {
      pauseMeteorOriginal();
      primeMainMusic();
      playAudio(dom.confessionMusic, "主背景音乐", "把主背景.m4a 放到 assets/music/main-background.m4a。", undefined, {
        fadeIn: pageId === "blessingPage",
        fadeMs: appleDevice ? 960 : 720,
      });
      return;
    }

    if (pageId !== "meteorPage") pauseMeteorOriginal();
    pauseAudio(dom.confessionMusic);
  }

  function applyLyrics(pageId) {
    if (!dom.lyricsOverlay || !dom.lyricsText) return;

    const lyricPages = new Set(["blessingPage", "heartPage", "galleryPage", "videosPage", "messagePage", "finalFireworksPage", "endingPage"]);
    const cues = Array.isArray(config.lyricCues) ? config.lyricCues.filter((cue) => cue && Number.isFinite(cue.time) && cue.text) : [];
    state.lyricsActive = lyricPages.has(pageId) && cues.length > 0;
    state.lyricIndex = -1;

    if (!state.lyricsActive) {
      dom.lyricsOverlay.classList.remove("active");
      dom.lyricsOverlay.setAttribute("aria-hidden", "true");
      return;
    }

    syncLyricsToMusic();
  }

  function syncLyricsToMusic() {
    if (!state.lyricsActive || !dom.confessionMusic) return;
    if (dom.confessionMusic.paused) {
      state.lyricIndex = -1;
      dom.lyricsOverlay.classList.remove("active");
      dom.lyricsOverlay.setAttribute("aria-hidden", "true");
      return;
    }
    const cues = config.lyricCues;
    const currentTime = dom.confessionMusic.currentTime || 0;
    let nextIndex = -1;

    for (let index = cues.length - 1; index >= 0; index -= 1) {
      if (currentTime >= cues[index].time) {
        nextIndex = index;
        break;
      }
    }

    if (nextIndex === state.lyricIndex) return;
    state.lyricIndex = nextIndex;
    if (nextIndex < 0) {
      dom.lyricsOverlay.classList.remove("active");
      dom.lyricsOverlay.setAttribute("aria-hidden", "true");
      return;
    }

    dom.lyricsText.textContent = cues[nextIndex].text;
    dom.lyricsOverlay.classList.remove("active");
    void dom.lyricsOverlay.offsetWidth;
    dom.lyricsOverlay.classList.add("active");
    dom.lyricsOverlay.setAttribute("aria-hidden", "false");
  }

  function playAudio(audio, label, missingHint, targetVolume, options = {}) {
    if (!audio) return;
    window.cancelAnimationFrame(state.musicVolumeRaf);
    window.clearTimeout(state.musicDuckTimer);
    state.musicVolumeRaf = 0;
    state.musicDuckTimer = null;
    prepareAudioElement(audio);
    audio.muted = false;
    const desiredVolume = Number.isFinite(targetVolume) ? targetVolume : label === "倒计时音乐" ? 0.42 : mainMusicVolume;
    const shouldFadeIn = Boolean(options.fadeIn && audio.paused);
    let fadeStarted = false;
    const beginFade = () => {
      if (!shouldFadeIn || fadeStarted) return;
      fadeStarted = true;
      fadeAudioVolume(audio, desiredVolume, options.fadeMs || 720);
    };
    audio.volume = shouldFadeIn ? 0.001 : desiredVolume;
    try {
      const playResult = audio.play();
      if (shouldFadeIn) audio.addEventListener("playing", beginFade, { once: true });
      if (playResult && typeof playResult.catch === "function") {
        playResult.then(() => {
          state.audioBlocked = false;
          beginFade();
        }).catch(() => {
          state.audioBlocked = true;
        });
      } else {
        window.setTimeout(beginFade, 80);
      }
    } catch (_error) {
      state.audioBlocked = true;
    }
  }

  function pauseAudio(audio) {
    if (audio) audio.pause();
  }

  function pauseMeteorOriginal() {
    if (dom.meteorVideo) dom.meteorVideo.pause();
    pauseAudio(dom.meteorAudio);
  }

  function prepareMeteorText() {
    const text = dom.meteorTitle.dataset.text || dom.meteorTitle.textContent;
    const firstDelay = 1200;
    const stepDelay = 850;
    const charDuration = 900;
    dom.meteorTitle.innerHTML = "";
    Array.from(text).forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "meteor-title-char";
      span.textContent = char;
      span.style.animationDelay = `${firstDelay + index * stepDelay}ms`;
      dom.meteorTitle.appendChild(span);
    });
    const titleDoneMs = firstDelay + Math.max(0, text.length - 1) * stepDelay + charDuration;
    state.meteorSubDelayMs = titleDoneMs + 450;
    state.meteorRevealMs = titleDoneMs + 3200;
  }

  function prepareDecorativeVideo(video, preload = "metadata") {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = preload;
  }

  function playMeteorOriginal() {
    pauseAudio(dom.countdownMusic);
    pauseAudio(dom.confessionMusic);

    if (appleDevice) {
      if (dom.meteorVideo && !appleMobile) {
        prepareDecorativeVideo(dom.meteorVideo, "metadata");
        ensureMediaElementSource(dom.meteorVideo);
        dom.meteorVideo.currentTime = 0;
        dom.meteorVideo.play().catch(() => {});
      } else if (dom.meteorVideo) {
        dom.meteorVideo.pause();
      }
      if (dom.meteorAudio) {
        prepareAudioElement(dom.meteorAudio);
        dom.meteorAudio.currentTime = 0;
        dom.meteorAudio.loop = false;
        playAudio(dom.meteorAudio, "流星原声", "", 0.9);
      }
      return;
    }

    if (!dom.meteorVideo) return;
    ensureMediaElementSource(dom.meteorVideo);
    dom.meteorVideo.removeAttribute("muted");
    dom.meteorVideo.muted = false;
    dom.meteorVideo.defaultMuted = false;
    dom.meteorVideo.volume = 0.95;
    dom.meteorVideo.currentTime = 0;
    try {
      const playResult = dom.meteorVideo.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {
          if (state.page !== "meteorPage") return;
          if (dom.meteorAudio) {
            dom.meteorAudio.currentTime = 0;
            playAudio(dom.meteorAudio, "流星原声", "", 0.9);
          }
        });
      }
    } catch (_error) {
      if (state.page !== "meteorPage") return;
      if (dom.meteorAudio) {
        dom.meteorAudio.currentTime = 0;
        playAudio(dom.meteorAudio, "流星原声", "", 0.9);
      }
    }
  }

  function startMeteorPage() {
    dom.meteorNextBtn.classList.remove("visible");
    dom.meteorNextBtn.disabled = true;
    dom.meteorTitle.querySelectorAll(".meteor-title-char").forEach((char) => {
      char.classList.remove("is-visible");
      void char.offsetWidth;
      char.classList.add("is-visible");
    });
    dom.meteorSub.classList.remove("is-visible");
    dom.meteorSub.style.animationDelay = `${state.meteorSubDelayMs}ms`;
    void dom.meteorSub.offsetWidth;
    dom.meteorSub.classList.add("is-visible");
    state.meteorButtonTimer = window.setTimeout(() => {
      dom.meteorNextBtn.classList.add("visible");
      dom.meteorNextBtn.disabled = false;
    }, state.meteorRevealMs);

    if (dom.meteorVideo && !appleMobile) {
      prepareDecorativeVideo(dom.meteorVideo, "metadata");
      ensureMediaElementSource(dom.meteorVideo);
    }

    if (state.audioUnlocked) playMeteorOriginal();

    primeCountdownMusic();
    scheduleCountdownWarm();
  }

  function scheduleCountdownWarm() {
    if (useCountdownFallback) return;
    if (!dom.countdownFrame || dom.countdownFrame.dataset.loadState || state.countdownWarmTimer) return;
    const delay = appleDesktop ? Math.max(2800, state.meteorRevealMs - 1600) : 900;
    state.countdownWarmTimer = window.setTimeout(() => {
      state.countdownWarmTimer = null;
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(ensureCountdownLoaded, { timeout: 1200 });
      } else {
        ensureCountdownLoaded();
      }
    }, 900);
  }

  function ensureCountdownLoaded() {
    if (!dom.countdownFrame || dom.countdownFrame.dataset.loadState) return;
    const src = dom.countdownFrame.dataset.src;
    if (!src) return;
    dom.countdownFrame.dataset.loadState = "loading";
    state.countdownFrameReady = false;
    state.countdownReadyAt = 0;
    dom.countdownFrame.src = src;
  }

  function startCountdown() {
    dom.skipCountdownBtn.hidden = false;
    dom.countdownNextBtn.classList.remove("visible");
    dom.countdownNextBtn.disabled = true;
    state.countdownStarted = false;
    if (useCountdownFallback) {
      if (dom.countdownFrame) {
        dom.countdownFrame.hidden = true;
        dom.countdownFrame.src = "about:blank";
      }
      startFallbackCountdown();
      return;
    }
    if (dom.countdownFrame) dom.countdownFrame.hidden = false;
    ensureCountdownLoaded();
    requestCountdownStart();
  }

  function resizeFallbackCountdownCanvas() {
    if (!dom.fallbackCountdownCanvas) return;
    const canvas = dom.fallbackCountdownCanvas;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const height = Math.max(1, Math.floor(rect.height || window.innerHeight));
    canvas.width = width;
    canvas.height = height;
  }

  function makeFallbackStars() {
    const total = reducedMotion ? 46 : 86;
    state.countdownFallbackStars = Array.from({ length: total }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.0005,
    }));
  }

  function drawFallbackCountdown(now) {
    if (state.page !== "countdownPage" || !useCountdownFallback || !dom.fallbackCountdownCanvas) return;

    const canvas = dom.fallbackCountdownCanvas;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.5, height * 0.42, 8, width * 0.5, height * 0.42, width * 0.78);
    glow.addColorStop(0, "rgba(255, 139, 198, 0.25)");
    glow.addColorStop(0.42, "rgba(121, 225, 255, 0.13)");
    glow.addColorStop(1, "rgba(4, 6, 18, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    state.countdownFallbackStars.forEach((star, index) => {
      star.y += 0.00028 * star.z;
      star.x += star.drift + Math.sin(now * 0.0007 + star.phase) * 0.00008;
      if (star.y > 1.08) {
        star.y = -0.08;
        star.x = Math.random();
      }
      if (star.x < -0.04) star.x = 1.04;
      if (star.x > 1.04) star.x = -0.04;

      const alpha = 0.22 + Math.sin(now * 0.002 + star.phase) * 0.12 + (index % 7 === 0 ? 0.18 : 0);
      const radius = 1.1 + star.z * 1.6;
      ctx.fillStyle = index % 5 === 0
        ? `rgba(255, 205, 236, ${alpha})`
        : `rgba(151, 241, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    state.countdownFallbackRaf = window.requestAnimationFrame(drawFallbackCountdown);
  }

  function setFallbackPhase(phase) {
    if (!dom.countdownFallback || state.page !== "countdownPage") return;

    state.countdownFallbackPhase += 1;
    const phaseToken = state.countdownFallbackPhase;
    const ready = phase === "ready";
    const final = phase === "final";
    const numeric = !ready && !final;

    if (dom.fallbackReadyText) dom.fallbackReadyText.classList.toggle("visible", ready);
    if (dom.fallbackNumber) {
      dom.fallbackNumber.textContent = numeric ? phase : "";
      dom.fallbackNumber.classList.remove("pop");
      void dom.fallbackNumber.offsetWidth;
      dom.fallbackNumber.classList.toggle("visible", numeric);
      if (numeric) dom.fallbackNumber.classList.add("pop");
    }
    if (dom.fallbackCake) dom.fallbackCake.classList.toggle("visible", final);
    if (dom.fallbackFinalText) dom.fallbackFinalText.classList.toggle("visible", final);

    if (ready) {
      state.countdownFallbackTimer = window.setTimeout(() => {
        if (phaseToken === state.countdownFallbackPhase) setFallbackPhase("5");
      }, 1400);
      return;
    }

    if (numeric) {
      const next = String(Number(phase) - 1);
      state.countdownFallbackTimer = window.setTimeout(() => {
        if (phaseToken !== state.countdownFallbackPhase) return;
        if (Number(phase) > 1) setFallbackPhase(next);
        else setFallbackPhase("final");
      }, phase === "1" ? 1450 : 1180);
      return;
    }

    state.countdownFallbackTimer = window.setTimeout(() => {
      if (phaseToken !== state.countdownFallbackPhase) return;
      dom.skipCountdownBtn.hidden = true;
      dom.countdownNextBtn.classList.add("visible");
      dom.countdownNextBtn.disabled = false;
    }, 1500);
  }

  function startFallbackCountdown() {
    stopFallbackCountdown();
    if (!dom.countdownFallback) return;
    dom.countdownFallback.hidden = false;
    dom.countdownFallback.setAttribute("aria-hidden", "false");
    dom.countdownFallback.classList.add("active");
    if (dom.fallbackReadyText) dom.fallbackReadyText.classList.remove("visible");
    if (dom.fallbackNumber) {
      dom.fallbackNumber.textContent = "";
      dom.fallbackNumber.classList.remove("visible", "pop");
    }
    if (dom.fallbackCake) dom.fallbackCake.classList.remove("visible");
    if (dom.fallbackFinalText) dom.fallbackFinalText.classList.remove("visible");

    resizeFallbackCountdownCanvas();
    makeFallbackStars();
    state.countdownFallbackRaf = window.requestAnimationFrame(drawFallbackCountdown);
    setFallbackPhase("ready");
  }

  function stopFallbackCountdown() {
    window.clearTimeout(state.countdownFallbackTimer);
    state.countdownFallbackTimer = null;
    window.cancelAnimationFrame(state.countdownFallbackRaf);
    state.countdownFallbackRaf = 0;
    state.countdownFallbackPhase += 1;
    if (dom.countdownFallback) {
      dom.countdownFallback.classList.remove("active");
      dom.countdownFallback.hidden = true;
      dom.countdownFallback.setAttribute("aria-hidden", "true");
    }
    if (dom.fallbackCountdownCanvas) {
      const ctx = dom.fallbackCountdownCanvas.getContext("2d");
      ctx.clearRect(0, 0, dom.fallbackCountdownCanvas.width, dom.fallbackCountdownCanvas.height);
    }
  }

  function requestCountdownStart() {
    if (!state.countdownFrameReady || state.countdownStarted) return;
    state.countdownStarted = true;
    window.clearTimeout(state.countdownStartTimer);
    const settleMs = appleDesktop ? 850 : 0;
    const elapsedSinceReady = state.countdownReadyAt ? performance.now() - state.countdownReadyAt : settleMs;
    const delay = Math.max(0, settleMs - elapsedSinceReady);
    state.countdownStartTimer = window.setTimeout(() => {
      state.countdownStartTimer = null;
      if (state.page !== "countdownPage" || !state.countdownFrameReady) return;
      postCountdownMessage("birthday-countdown:start");
    }, delay);
  }

  function postCountdownMessage(type) {
    const target = dom.countdownFrame && dom.countdownFrame.dataset.loadState && dom.countdownFrame.contentWindow;
    if (!target) return;
    target.postMessage({ type }, window.location.origin);
  }

  function handleCountdownMessage(event) {
    if (!dom.countdownFrame || event.origin !== window.location.origin || event.source !== dom.countdownFrame.contentWindow) return;
    const type = event.data && event.data.type;

    if (type === "birthday-countdown:ready") {
      state.countdownFrameReady = true;
      state.countdownReadyAt = performance.now();
      if (state.page === "countdownPage") requestCountdownStart();
      return;
    }

    if (type === "birthday-countdown:complete" && state.page === "countdownPage") {
      dom.skipCountdownBtn.hidden = true;
      dom.countdownNextBtn.classList.add("visible");
      dom.countdownNextBtn.disabled = false;
    }
  }

  function pulseNumber() {
    dom.countdownNumber.style.animation = "none";
    void dom.countdownNumber.offsetWidth;
    dom.countdownNumber.style.animation = "";
  }

  function resizeCountdownCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dom.countdownCanvas.width = Math.floor(window.innerWidth * dpr);
    dom.countdownCanvas.height = Math.floor(window.innerHeight * dpr);
    dom.countdownCanvas.style.width = `${window.innerWidth}px`;
    dom.countdownCanvas.style.height = `${window.innerHeight}px`;
    const ctx = dom.countdownCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.countdownController) state.countdownController.refresh();
  }

  function runCountdownParticles() {
    const ctx = dom.countdownCanvas.getContext("2d");
    const colors = ["#9ffcff", "#e9fbff", "#8acbff", "#c4a8ff"];
    const particles = Array.from({ length: 760 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      tx: window.innerWidth / 2,
      ty: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      r: Math.random() * 1.9 + 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shimmer: Math.random() * Math.PI * 2,
    }));
    const dust = Array.from({ length: 110 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 1 + 0.35,
      a: Math.random() * 0.5 + 0.2,
    }));
    const bursts = [];
    let mode = "text";
    let currentText = "5";
    let tick = 0;

    function buildTextPoints(text) {
      const offscreen = document.createElement("canvas");
      const octx = offscreen.getContext("2d");
      offscreen.width = 860;
      offscreen.height = 320;
      const fontSize = Math.max(86, Math.min(230, offscreen.width / Math.max(2.8, text.length * 0.72)));
      octx.clearRect(0, 0, offscreen.width, offscreen.height);
      octx.fillStyle = "#fff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.font = `900 ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
      octx.fillText(text, offscreen.width / 2, offscreen.height / 2);

      const image = octx.getImageData(0, 0, offscreen.width, offscreen.height).data;
      const gap = text.length > 2 ? 7 : 6;
      const points = [];
      for (let y = 0; y < offscreen.height; y += gap) {
        for (let x = 0; x < offscreen.width; x += gap) {
          const alpha = image[(y * offscreen.width + x) * 4 + 3];
          if (alpha > 128) {
            points.push({
              x: window.innerWidth / 2 + (x - offscreen.width / 2) * 1.05,
              y: window.innerHeight / 2 + (y - offscreen.height / 2) * 1.05,
            });
          }
        }
      }

      if (points.length) return points;
      return Array.from({ length: 80 }, (_, i) => {
        const angle = (i / 80) * Math.PI * 2;
        return {
          x: window.innerWidth / 2 + Math.cos(angle) * 120,
          y: window.innerHeight / 2 + Math.sin(angle) * 120,
        };
      });
    }

    function setText(text) {
      currentText = text;
      mode = "text";
      const points = buildTextPoints(text);
      particles.forEach((p, index) => {
        const point = points[index % points.length];
        p.tx = point.x + (Math.random() - 0.5) * 2.4;
        p.ty = point.y + (Math.random() - 0.5) * 2.4;
        p.color = colors[(index + text.length) % colors.length];
      });
    }

    function warp() {
      mode = "warp";
      particles.forEach((p) => {
        p.x = window.innerWidth / 2 + (Math.random() - 0.5) * 120;
        p.y = window.innerHeight / 2 + (Math.random() - 0.5) * 90;
        p.vx = (p.x - window.innerWidth / 2) * 0.085 + (Math.random() - 0.5) * 6;
        p.vy = (p.y - window.innerHeight / 2) * 0.085 + (Math.random() - 0.5) * 6;
      });
    }

    function createBurst(delay) {
      const cx = window.innerWidth * (0.2 + Math.random() * 0.6);
      const cy = window.innerHeight * (0.18 + Math.random() * 0.42);
      const color = colors[Math.floor(Math.random() * colors.length)];
      bursts.push({
        born: performance.now() + delay,
        sparks: Array.from({ length: 72 }, () => {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.7 + Math.random() * 4.2;
          return {
            x: cx,
            y: cy,
            px: cx,
            py: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.95 + Math.random() * 0.55,
            color,
          };
        }),
      });
    }

    function fireworks() {
      mode = "fireworks";
      bursts.length = 0;
      [0, 220, 440, 720, 980].forEach(createBurst);
    }

    function drawAmbient() {
      const grad = ctx.createRadialGradient(window.innerWidth / 2, window.innerHeight * 0.46, 20, window.innerWidth / 2, window.innerHeight * 0.46, window.innerWidth * 0.7);
      grad.addColorStop(0, "rgba(48, 222, 255, 0.14)");
      grad.addColorStop(0.45, "rgba(20, 86, 157, 0.08)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      dust.forEach((star) => {
        star.y += 0.12 * star.z;
        star.x += Math.sin(tick / 80 + star.z) * 0.07;
        if (star.y > window.innerHeight + 20) {
          star.y = -20;
          star.x = Math.random() * window.innerWidth;
        }
        ctx.fillStyle = `rgba(188, 249, 255, ${star.a})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.z * 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "rgba(98, 236, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i += 1) {
        const y = window.innerHeight * (0.18 + i * 0.1);
        ctx.beginPath();
        ctx.moveTo(window.innerWidth * 0.08, y + Math.sin(tick / 60 + i) * 10);
        ctx.lineTo(window.innerWidth * 0.92, y + Math.cos(tick / 70 + i) * 10);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBursts(now) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      bursts.forEach((burst) => {
        if (now < burst.born) return;
        burst.sparks.forEach((spark) => {
          spark.life -= 0.014;
          spark.px = spark.x;
          spark.py = spark.y;
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.vy += 0.018;
          const alphaHex = Math.max(0, Math.min(255, Math.floor(spark.life * 255))).toString(16).padStart(2, "0");
          ctx.strokeStyle = `${spark.color}${alphaHex}`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(spark.px, spark.py);
          ctx.lineTo(spark.x, spark.y);
          ctx.stroke();
        });
        burst.sparks = burst.sparks.filter((spark) => spark.life > 0);
      });
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        if (!bursts[i].sparks.length && now > bursts[i].born) bursts.splice(i, 1);
      }
      ctx.restore();
    }

    function draw() {
      tick += 1;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      drawAmbient();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (mode === "warp") {
        particles.forEach((p) => {
          const px = p.x;
          const py = p.y;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 1.055;
          p.vy *= 1.055;
          if (p.x < -120 || p.x > window.innerWidth + 120 || p.y < -120 || p.y > window.innerHeight + 120) {
            p.x = window.innerWidth / 2 + (Math.random() - 0.5) * 60;
            p.y = window.innerHeight / 2 + (Math.random() - 0.5) * 60;
            p.vx = (Math.random() - 0.5) * 14;
            p.vy = (Math.random() - 0.5) * 14;
          }
          ctx.strokeStyle = "rgba(151, 245, 255, 0.55)";
          ctx.lineWidth = p.r;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
      } else if (mode !== "fireworks") {
        particles.forEach((p) => {
          p.x += (p.tx - p.x) * 0.085;
          p.y += (p.ty - p.y) * 0.085;
          const alpha = 0.54 + Math.sin(tick / 9 + p.shimmer) * 0.25;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0.25, alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      drawBursts(performance.now());
      state.countdownRaf = window.requestAnimationFrame(draw);
    }

    setText(currentText);
    draw();

    return {
      setText,
      warp,
      fireworks,
      refresh() {
        setText(currentText);
      },
    };
  }

  function photoPath(file) {
    const base = appleMobile ? mobilePhotoBase : photoBase;
    return assetUrl(`${base}${file}`);
  }

  function photoLabel(_file) {
    return `第 ${state.photoIndex + 1} 张照片`;
  }

  function renderFilmStrip() {
    if (!dom.filmStrip) return;
    dom.filmStrip.innerHTML = "";
    config.photos.forEach((file, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `film-thumb${index === state.photoIndex ? " active" : ""}`;
      button.setAttribute("aria-label", `查看第 ${index + 1} 张照片`);
      button.innerHTML = `<img src="${photoPath(file)}" alt="" loading="lazy" />`;
      button.addEventListener("click", () => {
        state.photoIndex = index;
        renderPhoto();
      });
      dom.filmStrip.appendChild(button);
    });
  }

  function renderPhoto(direction = 0) {
    const file = config.photos[state.photoIndex];
    const src = photoPath(file);
    const img = document.createElement("img");
    const oldImg = dom.photoWindow.querySelector("img");
    img.alt = photoLabel(file);
    img.src = src;
    img.loading = "eager";
    img.decoding = "async";
    img.draggable = false;

    const mountPhoto = () => {
      if (!direction || !oldImg) {
        dom.photoWindow.innerHTML = "";
        dom.photoWindow.appendChild(img);
        state.photoTransitioning = false;
        return;
      }

      const movement = direction > 0 ? "next" : "previous";
      img.className = `photo-enter photo-enter-${movement}`;
      dom.photoWindow.appendChild(img);
      dom.photoWindow.classList.add("is-projecting");

      requestAnimationFrame(() => {
        oldImg.classList.add(`photo-exit-${movement}`);
        img.classList.add("is-active");
      });

      window.clearTimeout(state.photoFlipTimer);
      state.photoFlipTimer = window.setTimeout(() => {
        oldImg.remove();
        img.className = "";
        dom.photoWindow.classList.remove("is-projecting");
        state.photoTransitioning = false;
        state.photoFlipTimer = null;
      }, appleMobile ? 580 : 780);
    };

    if (img.complete) mountPhoto();
    else {
      img.addEventListener("load", mountPhoto, { once: true });
      img.addEventListener("error", mountPhoto, { once: true });
    }

    dom.photoCounter.textContent = `${String(state.photoIndex + 1).padStart(2, "0")} / ${config.photos.length}`;
    if (dom.photoAge) dom.photoAge.textContent = "";
    if (dom.photoFileName) dom.photoFileName.textContent = "";
    if (dom.prevPhotoBtn) dom.prevPhotoBtn.disabled = state.photoIndex === 0;
    if (dom.nextPhotoBtn) dom.nextPhotoBtn.setAttribute("aria-label", state.photoIndex === config.photos.length - 1 ? "继续" : "下一张");
    if (dom.finishGalleryBtn) {
      const isLast = state.photoIndex === config.photos.length - 1;
      dom.finishGalleryBtn.classList.toggle("visible", isLast);
      dom.finishGalleryBtn.disabled = !isLast;
    }

    renderFilmStrip();
    const active = dom.filmStrip ? dom.filmStrip.querySelector(".film-thumb.active") : null;
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    const next = config.photos[state.photoIndex + 1];
    if (next) {
      const preload = new Image();
      preload.decoding = "async";
      preload.src = photoPath(next);
    }

    if (!appleDevice && state.photoIndex >= Math.max(0, config.photos.length - 3)) ensureVideosRendered();
  }

  function movePhoto(step) {
    if (state.photoTransitioning) return;
    const total = config.photos.length;
    const nextIndex = state.photoIndex + step;
    if (step > 0 && nextIndex >= total) {
      playFilmFlipSound();
      showPage("videosPage");
      return;
    }
    if (nextIndex < 0 || nextIndex >= total) return;
    state.photoTransitioning = true;
    state.photoIndex = nextIndex;
    playFilmFlipSound();
    renderPhoto(step);
  }

  function openLightbox() {
    const file = config.photos[state.photoIndex];
    dom.lightboxImg.src = photoPath(file);
    dom.lightboxImg.alt = photoLabel(file);
    dom.lightboxCaption.textContent = `${String(state.photoIndex + 1).padStart(2, "0")} / ${config.photos.length}`;
    dom.lightbox.classList.add("open");
  }

  function closeLightbox() {
    dom.lightbox.classList.remove("open");
  }

  function renderBoardMessages() {
    if (dom.messageCursor) dom.messageCursor.hidden = true;
    if (dom.eggBtn) dom.eggBtn.classList.add("visible");
    dom.messageText.innerHTML = config.boardMessages
      .map((item, index) => `
        <section class="board-note">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.text)}</p>
        </section>
      `)
      .join("");
  }

  function scheduleVideosWarm() {
    if (appleDevice) return;
    if (state.videosRendered || state.videosWarmTimer) return;
    state.videosWarmTimer = window.setTimeout(() => {
      state.videosWarmTimer = null;
      ensureVideosRendered();
    }, 2200);
  }

  function ensureVideosRendered() {
    if (state.videosRendered) return;
    renderVideos();
  }

  function prepareBlessingVideoElement(player, loadMode = "metadata") {
    if (!player) return;
    const source = player.dataset.src;
    player.preload = loadMode;
    player.playsInline = true;
    player.setAttribute("playsinline", "");
    player.setAttribute("webkit-playsinline", "");
    if (source && !player.currentSrc && !player.getAttribute("src")) {
      player.src = source;
    }
    if (loadMode === "auto" && player.readyState < 1) {
      try {
        player.load();
      } catch (_error) {}
    }
  }

  function setVideoPrompt(prompt, text, loading = false) {
    if (!prompt) return;
    const label = prompt.querySelector("b");
    if (label) label.textContent = text;
    prompt.classList.toggle("is-loading", loading);
    prompt.classList.remove("is-hidden");
    prompt.removeAttribute("aria-hidden");
    prompt.tabIndex = 0;
  }

  function playBlessingVideo(player, prompt) {
    if (!player) return;
    unlockAudio();
    pauseAllVideos(player);
    prepareBlessingVideoElement(player, "auto");
    setVideoPrompt(prompt, "正在打开视频", true);

    const fail = () => {
      setVideoPrompt(prompt, "视频加载慢，点我重试", false);
      resumeMainMusic();
    };

    try {
      if (player.error) {
        const source = player.dataset.src;
        player.removeAttribute("src");
        player.load();
        if (source) player.src = source;
        player.load();
      }
      const playResult = player.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {
          window.setTimeout(() => {
            prepareBlessingVideoElement(player, "auto");
            player.play().catch(fail);
          }, 260);
        });
      }
    } catch (_error) {
      fail();
    }
  }

  function renderVideos() {
    if (state.videosRendered) return;
    state.videosRendered = true;
    dom.videoGrid.innerHTML = "";
    setVideosNextVisible(false);
    config.videos.forEach((video, index) => {
      const article = document.createElement("article");
      article.className = "video-card";
      const media = video.src
        ? `
            <video src="${assetUrl(video.src)}" data-src="${assetUrl(video.src)}" ${video.poster ? `poster="${assetUrl(video.poster)}"` : ""} controls playsinline webkit-playsinline preload="metadata"></video>
            <button class="video-play-prompt" type="button" aria-label="播放祝福视频">
              <i aria-hidden="true"></i>
              <b>点击播放祝福视频</b>
            </button>
          `
        : `<div class="video-placeholder">${escapeHtml(video.hint)}</div>`;
      article.innerHTML = `
        <div><span>${escapeHtml(video.role)}</span><h3>${escapeHtml(video.title)}</h3></div>
        <div class="video-media">${media}</div>
        <small>VIDEO ${String(index + 1).padStart(2, "0")}</small>
      `;
      dom.videoGrid.appendChild(article);
      const player = article.querySelector("video");
      const prompt = article.querySelector(".video-play-prompt");
      if (player) {
        prepareBlessingVideoElement(player);
        player.dataset.completed = "false";
        if (prompt) {
          prompt.addEventListener("click", () => playBlessingVideo(player, prompt));
        }
        player.addEventListener("loadedmetadata", () => {
          if (prompt && !prompt.classList.contains("is-hidden")) setVideoPrompt(prompt, "点击播放祝福视频", false);
        });
        player.addEventListener("play", () => {
          if (prompt) {
            prompt.classList.add("is-hidden");
            prompt.classList.remove("is-loading");
            prompt.setAttribute("aria-hidden", "true");
            prompt.tabIndex = -1;
          }
          lowerMainMusicForVideo();
        });
        player.addEventListener("waiting", () => {
          if (!player.paused && prompt) setVideoPrompt(prompt, "视频缓冲中", true);
        });
        player.addEventListener("playing", () => {
          if (prompt) {
            prompt.classList.add("is-hidden");
            prompt.classList.remove("is-loading");
          }
        });
        player.addEventListener("error", () => {
          setVideoPrompt(prompt, "视频加载慢，点我重试", false);
        });
        player.addEventListener("pause", resumeMainMusic);
        player.addEventListener("ended", () => {
          player.dataset.completed = "true";
          resumeMainMusic();
          const players = Array.from(dom.videoGrid.querySelectorAll("video"));
          setVideosNextVisible(players.length > 0 && players.every((item) => item.dataset.completed === "true"));
        });
      }
    });
  }

  function startVideosPage() {
    ensureVideosRendered();
    pauseAllVideos();
    const players = Array.from(dom.videoGrid.querySelectorAll("video"));
    players.forEach((player) => prepareBlessingVideoElement(player, "auto"));
    setVideosNextVisible(players.length > 0 && players.every((player) => player.dataset.completed === "true"));
  }

  function setVideosNextVisible(visible) {
    if (!dom.videoActions || !dom.videosNextBtn) return;
    dom.videoActions.hidden = !visible;
    dom.videoActions.classList.toggle("visible", visible);
    dom.videosNextBtn.disabled = !visible;
  }

  function lowerMainMusicForVideo() {
    pauseAudio(dom.countdownMusic);
    if (!state.audioUnlocked || !dom.confessionMusic || dom.confessionMusic.paused) return;
    window.clearTimeout(state.musicDuckTimer);
    state.musicDuckTimer = null;
    fadeAudioVolume(dom.confessionMusic, 0.065, 420);
  }

  function resumeMainMusic() {
    if (state.page !== "videosPage" || !state.audioUnlocked) return;
    window.clearTimeout(state.musicDuckTimer);
    state.musicDuckTimer = null;
    if (dom.confessionMusic.paused) {
      dom.confessionMusic.volume = 0.065;
      dom.confessionMusic.play().catch(() => {});
    }
    fadeAudioVolume(dom.confessionMusic, mainMusicVolume, 620);
  }

  function pauseAllVideos(except = null) {
    document.querySelectorAll("video").forEach((video) => {
      if (video !== except && video.id !== "meteorVideo" && video.id !== "fireworksVideo") video.pause();
    });
  }

  function pauseBlessingVideos() {
    document.querySelectorAll(".video-media video").forEach((video) => video.pause());
  }

  function setBlessingSpacing() {
    const totalLength = config.blessing.join("").length;
    const lineHeight = totalLength > 700 ? 1.82 : 1.94;
    dom.blessingCard.style.setProperty("--blessing-line", lineHeight);
  }

  function startBlessingTypewriter() {
    setBlessingSpacing();
    dom.heartStartBtn.classList.remove("visible");
    dom.heartStartBtn.disabled = true;
    if (dom.blessingPage) dom.blessingPage.scrollTop = 0;

    if (state.blessingDone) {
      showFullBlessing();
      return;
    }

    dom.blessingText.innerHTML = "";
    if (dom.blessingCursor) dom.blessingCursor.hidden = false;
    const paragraphs = config.blessing.map((line, paragraphIndex) => {
      const paragraph = document.createElement("p");
      const classes = [];
      if (line.length < 32) classes.push("short");
      if (paragraphIndex >= config.blessing.length - 2) classes.push("signature");
      paragraph.className = classes.join(" ");
      const textNode = document.createTextNode("");
      paragraph.appendChild(textNode);
      dom.blessingText.appendChild(paragraph);
      return { line, textNode };
    });
    let paragraphIndex = 0;
    let characterIndex = 0;
    let totalTyped = 0;

    function keepLatestTextVisible() {
      if (!dom.blessingPage) return;
      window.requestAnimationFrame(() => {
        dom.blessingPage.scrollTop = dom.blessingPage.scrollHeight;
      });
    }

    function tick() {
      const current = paragraphs[paragraphIndex];
      if (!current) {
        completeBlessing();
        return;
      }

      const char = current.line.charAt(characterIndex);
      current.textNode.appendData(char);
      characterIndex += 1;
      totalTyped += 1;

      const paragraphDone = characterIndex >= current.line.length;
      if (paragraphDone) {
        paragraphIndex += 1;
        characterIndex = 0;
      }

      if (totalTyped % 20 === 0 || paragraphDone || /[。！？；]/.test(char)) keepLatestTextVisible();

      const delay = paragraphDone ? 240 : /[。！？；]/.test(char) ? 190 : /[，、]/.test(char) ? 105 : 58;
      state.blessingTimer = window.setTimeout(tick, delay);
    }

    tick();
  }

  function renderBlessingText(text) {
    dom.blessingText.innerHTML = config.blessing
      .map((line, index) => {
        const paragraphs = text.split(/\n{2,}/);
        const visibleLine = paragraphs[index] || "";
        if (!visibleLine) return "";
        const classes = [];
        if (line.length < 32) classes.push("short");
        if (index >= config.blessing.length - 2) classes.push("signature");
        return `<p class="${classes.join(" ")}">${escapeHtml(visibleLine)}</p>`;
      })
      .join("");
  }

  function showFullBlessing() {
    renderBlessingText(config.blessing.join("\n\n"));
    completeBlessing();
  }

  function completeBlessing() {
    state.blessingDone = true;
    if (dom.blessingCursor) dom.blessingCursor.hidden = true;
    dom.heartStartBtn.classList.add("visible");
    dom.heartStartBtn.disabled = false;
  }

  function fadeAudioVolume(audio, target, duration) {
    if (!audio) return;
    window.cancelAnimationFrame(state.musicVolumeRaf);
    const startVolume = audio.volume;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      audio.volume = startVolume + (target - startVolume) * eased;
      if (progress < 1) state.musicVolumeRaf = window.requestAnimationFrame(step);
      else state.musicVolumeRaf = 0;
    }

    state.musicVolumeRaf = window.requestAnimationFrame(step);
  }

  function duckMainMusicForFilmFlip() {
    const music = dom.confessionMusic;
    if (!music || music.paused || state.page !== "galleryPage") return;
    window.clearTimeout(state.musicDuckTimer);
    fadeAudioVolume(music, galleryDuckVolume, 55);
    state.musicDuckTimer = window.setTimeout(() => {
      fadeAudioVolume(music, mainMusicVolume, 280);
      state.musicDuckTimer = null;
    }, 210);
  }

  function playFilmFlipSound() {
    duckMainMusicForFilmFlip();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      state.filmAudioCtx = state.filmAudioCtx || new AudioContext();
      const ctx = state.filmAudioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      master.connect(ctx.destination);

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const progress = i / data.length;
        const flutter = 0.72 + Math.sin(progress * Math.PI * 22) * 0.18;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 1.7) * flutter * 0.68;
      }

      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2380, now);
      filter.Q.setValueAtTime(1.08, now);
      noise.buffer = buffer;
      noise.connect(filter);
      filter.connect(master);
      noise.start(now);
      noise.stop(now + 0.22);

      [920, 1540].forEach((frequency, index) => {
        const click = ctx.createOscillator();
        const gain = ctx.createGain();
        click.type = "triangle";
        click.frequency.setValueAtTime(frequency, now + index * 0.052);
        click.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 0.07 + index * 0.052);
        gain.gain.setValueAtTime(0.3, now + index * 0.052);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075 + index * 0.052);
        click.connect(gain);
        gain.connect(master);
        click.start(now + index * 0.052);
        click.stop(now + 0.09 + index * 0.052);
      });
    } catch (_error) {}
  }

  function startProjectorSound() {
    if (state.projectorNodes) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      state.filmAudioCtx = state.filmAudioCtx || new AudioContext();
      const ctx = state.filmAudioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        const pulse = 0.52 + Math.sin((index / ctx.sampleRate) * Math.PI * 34) * 0.18;
        data[index] = (Math.random() * 2 - 1) * pulse;
      }

      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "bandpass";
      filter.frequency.value = 1520;
      filter.Q.value = 1.08;
      gain.gain.value = 0.006;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      state.projectorNodes = { source, gain };
    } catch (_error) {}
  }

  function stopProjectorSound() {
    if (!state.projectorNodes || !state.filmAudioCtx) return;
    const { source, gain } = state.projectorNodes;
    const now = state.filmAudioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    source.stop(now + 0.14);
    state.projectorNodes = null;
  }

  function clearHeartTimers() {
    window.clearTimeout(state.heartScatterTimer);
    window.clearTimeout(state.heartContinueTimer);
    state.heartScatterTimer = null;
    state.heartContinueTimer = null;
  }

  function positionHeartPopups() {
    const cards = Array.from(dom.heartLayer.querySelectorAll(".heart-popup"));
    if (!cards.length) return;
    const cardW = window.innerWidth < 640 ? 118 : 150;
    const cardH = window.innerWidth < 640 ? 48 : 60;
    const scale = Math.max(1, Math.min((window.innerWidth - cardW * 2) / 36, (window.innerHeight - cardH * 2) / 31));
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 + 18;

    cards.forEach((card) => {
      const baseLeft = centerX + Number(card.dataset.heartX) * scale - cardW / 2;
      const baseTop = centerY - Number(card.dataset.heartY) * scale - cardH / 2;
      const scatterLeft = Number(card.dataset.scatterX) * Math.max(1, window.innerWidth - cardW);
      const scatterTop = Number(card.dataset.scatterY) * Math.max(1, window.innerHeight - cardH);
      card.style.left = `${baseLeft}px`;
      card.style.top = `${baseTop}px`;
      card.style.setProperty("--scatter-x", `${scatterLeft - baseLeft}px`);
      card.style.setProperty("--scatter-y", `${scatterTop - baseTop}px`);
    });
  }

  function startHeartPopups() {
    const layer = dom.heartLayer;
    clearHeartTimers();
    layer.innerHTML = "";
    dom.heartNextBtn.classList.remove("visible");

    const count = appleMobile ? 40 : lowPowerDevice ? (window.innerWidth < 640 ? 52 : 72) : 100;
    const revealStep = reducedMotion ? 8 : appleMobile ? 18 : 26;

    for (let i = 0; i < count; i += 1) {
      const t = (i / count) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const card = document.createElement("div");
      card.className = "heart-popup";
      card.textContent = i === count - 1 ? "充实自己" : config.heartMessages[Math.floor(Math.random() * config.heartMessages.length)];
      card.style.background = config.heartColors[Math.floor(Math.random() * config.heartColors.length)];
      card.dataset.heartX = String(x);
      card.dataset.heartY = String(y);
      card.dataset.scatterX = String(Math.random());
      card.dataset.scatterY = String(Math.random());
      card.style.setProperty("--reveal-delay", `${i * revealStep}ms`);
      card.style.setProperty("--tilt", `${Math.random() * 18 - 9}deg`);
      layer.appendChild(card);
    }

    positionHeartPopups();
    const revealSpan = count * revealStep;
    state.heartScatterTimer = window.setTimeout(() => {
      layer.querySelectorAll(".heart-popup").forEach((card) => {
        card.classList.add("scatter");
      });
      state.heartScatterTimer = null;
    }, revealSpan + (reducedMotion ? 120 : 900));

    state.heartContinueTimer = window.setTimeout(() => {
      dom.heartNextBtn.classList.add("visible");
      state.heartContinueTimer = null;
    }, revealSpan + (reducedMotion ? 260 : 2200));
  }

  function warmFireworksVideo() {
    if (!dom.fireworksVideo || state.fireworksWarmed) return;
    if (appleMobile) return;
    state.fireworksWarmed = true;
    ensureMediaElementSource(dom.fireworksVideo);
    dom.fireworksVideo.preload = "metadata";
    dom.fireworksVideo.load();
  }

  function startFinalFireworks() {
    if (dom.fireworksVideo && !appleMobile) {
      prepareDecorativeVideo(dom.fireworksVideo, "auto");
      ensureMediaElementSource(dom.fireworksVideo);
      dom.fireworksVideo.preload = "auto";
      dom.fireworksVideo.currentTime = 0;
      dom.fireworksVideo.play().catch(() => {});
    }
    window.clearInterval(state.fireworksTimer);
    dom.fireworksText.textContent = "";
    let index = 0;
    state.fireworksTimer = window.setInterval(() => {
      dom.fireworksText.textContent = config.fireworksLines.slice(0, index + 1).join("\n");
      index += 1;
      if (index >= config.fireworksLines.length) {
        window.clearInterval(state.fireworksTimer);
        state.fireworksTimer = null;
      }
    }, 4600);
    dom.fireworksText.textContent = config.fireworksLines[0];
    index = 1;
  }

  function startEndingSky() {
    if (!dom.endingSky) return;
    const colors = ["#ff4f9a", "#ffd54a", "#64e8ff", "#9cffb5", "#c59cff", "#ff8b66"];
    const total = appleMobile ? 22 : window.innerWidth < 640 ? 34 : 52;
    dom.endingSky.innerHTML = "";

    for (let index = 0; index < total; index += 1) {
      const particle = document.createElement("span");
      const isHeart = index % 3 === 0;
      particle.className = `ending-fall ${isHeart ? "ending-fall--heart" : "ending-fall--star"}`;
      particle.textContent = isHeart ? "♥" : "★";
      particle.style.setProperty("--x", `${Math.random() * 100}%`);
      const drift = Math.random() * 150 - 75;
      particle.style.setProperty("--drift", `${drift}px`);
      particle.style.setProperty("--drift-mid", `${drift * 0.45}px`);
      particle.style.setProperty("--duration", `${7.5 + Math.random() * 6}s`);
      particle.style.setProperty("--delay", `${-Math.random() * 13}s`);
      particle.style.setProperty("--size", `${12 + Math.random() * 19}px`);
      particle.style.setProperty("--spin", `${Math.random() * 520 - 260}deg`);
      particle.style.setProperty("--color", colors[index % colors.length]);
      dom.endingSky.appendChild(particle);
    }
  }

  function resetStory() {
    state.photoIndex = 0;
    state.blessingDone = false;
    if (dom.messageCursor) dom.messageCursor.hidden = true;
    if (dom.blessingCursor) dom.blessingCursor.hidden = false;
    dom.heartStartBtn.classList.remove("visible");
    dom.heartStartBtn.disabled = true;
    dom.meteorNextBtn.classList.remove("visible");
    dom.meteorNextBtn.disabled = true;
    dom.passwordInput.value = "";
    dom.loginError.textContent = "";
    closeLightbox();
    showPage("loginPage");
  }

  function goToPage(id) {
    unlockAudio();
    if (id === "countdownPage") primeCountdownMusic();
    if (id === "blessingPage") primeMainMusic();
    showPage(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (dom.meteorVideo) dom.meteorVideo.pause();
      if (dom.fireworksVideo) dom.fireworksVideo.pause();
      if (state.page === "galleryPage") stopProjectorSound();
      return;
    }

    if (state.page === "meteorPage" && state.audioUnlocked) {
      playMeteorOriginal();
      return;
    }
    if (state.page === "finalFireworksPage" && dom.fireworksVideo && !appleMobile) dom.fireworksVideo.play().catch(() => {});
    if (state.audioUnlocked) applyStageMusic(state.page);
    if (state.page === "galleryPage") startProjectorSound();
  }

  function handleResize() {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      state.resizeTimer = null;
      if (state.page === "heartPage") positionHeartPopups();
    }, 160);
  }

  function bindEvents() {
    dom.enterBtn.addEventListener("click", () => {
      unlockAudio();
      if (dom.passwordInput.value.trim() !== config.password) {
        dom.loginError.textContent = "密码不对，再试一次。";
        dom.passwordInput.focus();
        return;
      }
      dom.loginError.textContent = "";
      showPage("meteorPage");
    });

    dom.passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") dom.enterBtn.click();
    });

    dom.meteorNextBtn.addEventListener("click", () => goToPage("countdownPage"));
    dom.skipCountdownBtn.addEventListener("click", () => goToPage("blessingPage"));
    dom.countdownNextBtn.addEventListener("click", () => goToPage("blessingPage"));
    dom.countdownFrame.addEventListener("load", () => {
      if (!dom.countdownFrame.dataset.loadState) return;
      dom.countdownFrame.dataset.loadState = "loaded";
    });
    window.addEventListener("message", handleCountdownMessage);
    ["timeupdate", "seeked", "play", "pause", "ended", "loadedmetadata"].forEach((eventName) => {
      dom.confessionMusic.addEventListener(eventName, syncLyricsToMusic);
    });
    dom.prevPhotoBtn.addEventListener("click", () => movePhoto(-1));
    dom.nextPhotoBtn.addEventListener("click", () => movePhoto(1));
    dom.zoomPhotoBtn.addEventListener("click", openLightbox);
    dom.photoWindow.addEventListener("click", openLightbox);
    dom.finishGalleryBtn.addEventListener("click", () => {
      unlockAudio();
      playFilmFlipSound();
      showPage("videosPage");
    });
    dom.lightboxClose.addEventListener("click", closeLightbox);
    dom.lightbox.addEventListener("click", (event) => {
      if (event.target === dom.lightbox) closeLightbox();
    });
    dom.skipMessageBtn.addEventListener("click", renderBoardMessages);
    dom.eggBtn.addEventListener("click", () => goToPage("finalFireworksPage"));
    dom.videosNextBtn.addEventListener("click", () => goToPage("messagePage"));
    dom.heartStartBtn.addEventListener("click", () => goToPage("heartPage"));
    dom.heartNextBtn.addEventListener("click", () => goToPage("galleryPage"));
    dom.fireworksNextBtn.addEventListener("click", () => goToPage("endingPage"));

    window.addEventListener("keydown", (event) => {
      if (state.page === "galleryPage") {
        if (event.key === "ArrowLeft") movePhoto(-1);
        if (event.key === "ArrowRight") movePhoto(1);
      }
      if (event.key === "Escape") closeLightbox();
    });

    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerdown", () => {
      if (!state.audioBlocked) return;
      unlockAudio();
      applyStageMusic(state.lastRequestedMusicPage);
    }, { passive: true });
  }

  function init() {
    prepareDecorativeVideo(dom.meteorVideo, appleMobile ? "none" : "metadata");
    prepareDecorativeVideo(dom.fireworksVideo, appleMobile ? "none" : "metadata");
    if (!appleMobile) ensureMediaElementSource(dom.meteorVideo);
    prepareMeteorText();
    setBlessingSpacing();
    dom.photoCounter.textContent = `01 / ${config.photos.length}`;
    dom.endingText.textContent = config.endingText;
    bindEvents();
  }

  init();
})();
