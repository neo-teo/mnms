// The Bulletin Board: every block in the course's Are.na channel
// (data.site.bulletinBoard), loaded from Are.na's public API, newest first
keepTheme();

let channelURL;

fetch("data.json")
  .then((res) => res.json())
  .then((data) => {
    // The home page's bar, with Back in place of Bulletin Board
    buildBar(data, `<a class="link" id="bar-link" href="./">Back</a>`);
    arrangeBar(savedBarLayout() || randomBarLayout());

    channelURL = data.site.bulletinBoard;
    const slug = channelURL.split("/").pop();
    return fetch(`https://api.are.na/v2/channels/${slug}/contents?per=100`);
  })
  .then((res) => {
    if (!res.ok) throw new Error(res.status);
    return res.json();
  })
  .then((json) => renderBoard(json.contents.reverse()))
  .catch(() => {
    document.getElementById("board").innerHTML =
      `<li class="board-message">The board couldn't load. Please try refreshing.</li>`;
  });

// First a big M&M in the theme color that opens the channel on Are.na, where
// people add to it. Then each block as a square preview with its title
// underneath, linking to its source (or to the block on Are.na when it has none)
function renderBoard(blocks) {
  const add = `
    <li>
      <a class="board-add" href="${channelURL}" target="_blank">
        <div class="board-preview">
          <span class="board-add-dot">Pin</span>
        </div>
      </a>
    </li>
  `;

  document.getElementById("board").innerHTML = add + blocks
    .map((b) => {
      if (b.class === "Channel") {
        return `
          <li>
            <a href="https://www.are.na/${b.user.slug}/${b.slug}" target="_blank">
              <div class="board-preview">
                <div class="box board-channel">
                  <span>${escapeHTML(b.title)}</span>
                  <span>${b.length} blocks</span>
                </div>
              </div>
            </a>
          </li>
        `;
      }

      const title = b.title || b.generated_title || "";
      const preview = b.image
        ? `<img src="${b.image.display.url}" alt="${escapeHTML(title)}" loading="lazy">`
        : `<div class="board-text">${escapeHTML(b.content || "")}</div>`;
      return `
        <li>
          <a href="${escapeHTML(b.source?.url || `https://www.are.na/block/${b.id}`)}" target="_blank">
            <div class="board-preview">${preview}</div>
            <p class="board-title">${escapeHTML(title)}</p>
          </a>
        </li>
      `;
    })
    .join("");

  // A new random tilt for the Pin circle every time it's hovered:
  // 10–25 degrees either way
  const pin = document.querySelector(".board-add");
  pin.addEventListener("mouseenter", () => {
    const angle = (10 + Math.random() * 15) * (Math.random() < 0.5 ? -1 : 1);
    pin.style.setProperty("--tilt", `${angle}deg`);
  });
}

// Are.na text is written by whoever adds to the board, so it's escaped
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/"/g, "&quot;");
}
