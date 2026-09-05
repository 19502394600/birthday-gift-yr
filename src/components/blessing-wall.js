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

  window.BirthdaySite.renderTraits = function renderTraits(config, dom) {
    dom.traitGrid.innerHTML = "";
    config.traits.forEach((trait, index) => {
      const card = document.createElement("article");
      card.className = "trait-card";
      card.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(trait.title)}</strong><p>${escapeHtml(trait.text)}</p></div>`;
      dom.traitGrid.appendChild(card);
    });
  };

  window.BirthdaySite.renderBlessings = function renderBlessings(config, dom) {
    const groups = ["朋友", "闺蜜", "家人"];
    const postcards = config.postcards || [];
    dom.blessingWall.innerHTML = "";

    groups.forEach((groupName) => {
      const groupCards = postcards.filter((card) => card.section === groupName);
      if (!groupCards.length) return;

      const group = document.createElement("section");
      group.className = "postcard-group";
      group.innerHTML = `
        <div class="postcard-group-title">
          <span>${escapeHtml(groupName)}</span>
          <strong>${groupName === "朋友" ? "朋友的祝福" : groupName === "闺蜜" ? "闺蜜的悄悄话" : "家人的惦记"}</strong>
        </div>
      `;

      const list = document.createElement("div");
      list.className = "postcard-list";

      groupCards.forEach((postcard, index) => {
        const card = document.createElement("article");
        card.className = "postcard-card";
        card.style.animationDelay = `${index * 120}ms`;
        if (postcard.bg) {
          card.style.setProperty("--postcard-image", `url("${postcard.bg}")`);
          card.classList.add("has-photo");
        }

        card.innerHTML = `
          <div class="postcard-photo-slot">
            <span>${postcard.bg ? "PHOTO BACKGROUND" : "照片背景空位"}</span>
            <small>${escapeHtml(postcard.fileName || "assets/photos/postcard.jpg")}</small>
          </div>
          <div class="postcard-copy">
            <span>${escapeHtml(postcard.from)}</span>
            <strong>${escapeHtml(postcard.title)}</strong>
            <p>${escapeHtml(postcard.text)}</p>
          </div>
        `;
        list.appendChild(card);
      });

      group.appendChild(list);
      dom.blessingWall.appendChild(group);
    });
  };
})();
