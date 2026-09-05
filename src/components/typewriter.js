(function () {
  window.BirthdaySite = window.BirthdaySite || {};

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => {
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

  window.BirthdaySite.createTypewriter = function createTypewriter(options) {
    const config = options.config;
    const dom = options.dom;
    const state = options.state;
    let typeTimer = 0;

    function getPause(char, isLineEnd) {
      if (isLineEnd) return 420;
      if ("。！？!?".includes(char)) return 280;
      if ("，、；;：:".includes(char)) return 150;
      return 48;
    }

    function start() {
      if (state.letterDone) return;
      clearTimeout(typeTimer);
      dom.letterText.innerHTML = "";
      dom.letterCursor.style.display = "inline-block";

      const paragraphs = config.letter.slice();
      let pIndex = 0;
      let cIndex = 0;
      let currentP = document.createElement("p");
      dom.letterText.appendChild(currentP);

      function tick() {
        const paragraph = paragraphs[pIndex];
        if (!paragraph) {
          state.letterDone = true;
          dom.letterCursor.style.display = "none";
          return;
        }

        currentP.textContent += paragraph[cIndex];
        const char = paragraph[cIndex];
        cIndex += 1;

        if (cIndex >= paragraph.length) {
          pIndex += 1;
          cIndex = 0;
          if (pIndex < paragraphs.length) {
            currentP = document.createElement("p");
            dom.letterText.appendChild(currentP);
          }
        }

        typeTimer = setTimeout(tick, state.reducedMotion ? 1 : getPause(char, cIndex === 0));
      }

      if (!paragraphs.join("")) {
        dom.letterCursor.style.display = "none";
        return;
      }

      tick();
    }

    function showFull() {
      clearTimeout(typeTimer);
      dom.letterText.innerHTML = config.letter.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
      dom.letterCursor.style.display = "none";
      state.letterDone = true;
    }

    function reset() {
      clearTimeout(typeTimer);
      state.letterDone = false;
      dom.letterText.innerHTML = "";
      dom.letterCursor.style.display = "inline-block";
    }

    return {
      start,
      showFull,
      reset,
    };
  };
})();
