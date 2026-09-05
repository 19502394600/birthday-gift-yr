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

  function createPhotoPlaceholder(photo, compact) {
    const holder = document.createElement("div");
    holder.className = compact ? "photo-placeholder is-compact" : "photo-placeholder";
    holder.innerHTML = `
      <div>
        <span>${escapeHtml(photo.kicker || "PHOTO")}</span>
        <strong>${escapeHtml(photo.title)}</strong>
        <p>${escapeHtml(photo.fileName || "assets/photos/your-photo.jpg")}</p>
      </div>
    `;
    return holder;
  }

  window.BirthdaySite.createFilmGallery = function createFilmGallery(options) {
    const config = options.config;
    const dom = options.dom;
    const state = options.state;
    const audio = options.audio;

    function render() {
      const photo = config.photos[state.photoIndex];
      dom.photoKicker.textContent = photo.kicker || `FILM ${String(state.photoIndex + 1).padStart(2, "0")}`;
      dom.photoTitle.textContent = photo.title;
      dom.photoNote.textContent = photo.note;
      dom.photoMedia.innerHTML = "";

      if (photo.src) {
        const img = new Image();
        img.src = photo.src;
        img.alt = photo.title;
        img.loading = "eager";
        dom.photoMedia.appendChild(img);
      } else {
        dom.photoMedia.appendChild(createPhotoPlaceholder(photo, false));
      }

      dom.photoFrame.classList.remove("is-moving");
      window.requestAnimationFrame(() => dom.photoFrame.classList.add("is-moving"));
      renderStrip();
      preloadNearby();
    }

    function renderStrip() {
      dom.filmStrip.innerHTML = "";
      dom.filmStrip.style.setProperty("--active-index", state.photoIndex);

      config.photos.forEach((photo, index) => {
        const thumb = document.createElement("button");
        thumb.className = `film-thumb${index === state.photoIndex ? " is-current" : ""}`;
        thumb.type = "button";
        thumb.setAttribute("aria-label", `查看${photo.title}`);
        thumb.style.setProperty("--tilt", `${(index % 2 === 0 ? -1 : 1) * (0.5 + (index % 3) * 0.24)}deg`);

        const sprocketTop = document.createElement("span");
        sprocketTop.className = "film-sprocket is-top";
        const sprocketBottom = document.createElement("span");
        sprocketBottom.className = "film-sprocket is-bottom";
        thumb.appendChild(sprocketTop);

        const frame = document.createElement("span");
        frame.className = "film-thumb-frame";
        if (photo.src) {
          const img = new Image();
          img.src = photo.src;
          img.alt = "";
          frame.appendChild(img);
        } else {
          frame.appendChild(createPhotoPlaceholder(photo, true));
        }
        thumb.appendChild(frame);
        thumb.appendChild(sprocketBottom);

        const label = document.createElement("span");
        label.className = "film-thumb-label";
        label.textContent = photo.kicker || String(index + 1).padStart(2, "0");
        thumb.appendChild(label);

        thumb.addEventListener("click", () => {
          state.photoIndex = index;
          audio.film();
          render();
        });

        dom.filmStrip.appendChild(thumb);
      });
    }

    function preloadNearby() {
      const total = config.photos.length;
      [-1, 1].forEach((offset) => {
        const photo = config.photos[(state.photoIndex + offset + total) % total];
        if (!photo || !photo.src) return;
        const img = new Image();
        img.src = photo.src;
      });
    }

    function move(direction) {
      const total = config.photos.length;
      state.photoIndex = (state.photoIndex + direction + total) % total;
      audio.film();
      render();
    }

    function openLightbox() {
      const photo = config.photos[state.photoIndex];
      dom.lightboxMedia.innerHTML = "";

      if (photo.src) {
        const img = new Image();
        img.src = photo.src;
        img.alt = photo.title;
        dom.lightboxMedia.appendChild(img);
      } else {
        dom.lightboxMedia.appendChild(createPhotoPlaceholder(photo, false));
      }

      dom.lightboxCaption.textContent = `${photo.title} - ${photo.note}`;
      dom.lightbox.classList.add("is-open");
    }

    function closeLightbox() {
      dom.lightbox.classList.remove("is-open");
    }

    function reset() {
      state.photoIndex = 0;
      closeLightbox();
      render();
    }

    return {
      render,
      move,
      openLightbox,
      closeLightbox,
      reset,
    };
  };
})();
