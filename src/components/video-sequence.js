(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return map[char];
    });
  }

  window.BirthdaySite.createVideoSequence = function createVideoSequence(options) {
    const config = options.config;
    const dom = options.dom;
    const audio = options.audio;
    const players = new Map();

    function activePlayers() {
      return Array.from(players.values()).filter((video) => !video.paused && !video.ended);
    }

    function updateAudioMode() {
      audio.videoMode(activePlayers().length > 0);
    }

    function pauseOthers(current) {
      players.forEach((video) => {
        if (video !== current) video.pause();
      });
      updateAudioMode();
    }

    function makeMedia(video, index) {
      const media = document.createElement("div");
      media.className = "video-media";

      if (video.src) {
        const player = document.createElement("video");
        player.controls = true;
        player.preload = "metadata";
        player.playsInline = true;
        player.src = video.src;
        if (video.poster) player.poster = video.poster;
        player.addEventListener("play", () => {
          audio.unlock();
          pauseOthers(player);
          updateAudioMode();
        });
        player.addEventListener("pause", updateAudioMode);
        player.addEventListener("ended", updateAudioMode);
        players.set(index, player);
        media.appendChild(player);
        return media;
      }

      const placeholder = document.createElement("div");
      placeholder.className = "video-slot";
      placeholder.innerHTML = `
        <span>VIDEO ${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(video.role || video.title || "祝福视频")}</strong>
        <p>${escapeHtml(video.fileName || "assets/videos/your-video.mp4")}</p>
      `;
      media.appendChild(placeholder);
      return media;
    }

    function render() {
      players.clear();
      dom.videoList.innerHTML = "";

      config.videos.forEach((video, index) => {
        const card = document.createElement("article");
        card.className = "video-card";
        card.style.animationDelay = `${index * 120}ms`;

        const header = document.createElement("div");
        header.className = "video-card-header";
        header.innerHTML = `
          <span>${escapeHtml(video.role || `视频 ${index + 1}`)}</span>
          <strong>${escapeHtml(video.title || "祝福视频")}</strong>
        `;

        const body = document.createElement("div");
        body.className = "video-copy";
        body.innerHTML = `
          <p>${escapeHtml(video.note || "")}</p>
          <small>${video.src ? "手动点击播放器播放，不会自动播放。" : `素材空位：请把视频放到 ${escapeHtml(video.fileName || "assets/videos/")}`}</small>
        `;

        card.appendChild(header);
        card.appendChild(makeMedia(video, index));
        card.appendChild(body);
        dom.videoList.appendChild(card);
      });
    }

    function pauseAll() {
      players.forEach((video) => video.pause());
      updateAudioMode();
    }

    function reset() {
      pauseAll();
      render();
    }

    return {
      render,
      pauseAll,
      reset,
    };
  };
})();
