// Shared by every page (loaded before the page's own script)

// ---------- Lights ----------

// Lights off is a soft dark mode (style.css swaps the colors). It's
// remembered in this browser, so every page and later visits keep it.
function lightsOff() {
  return document.documentElement.dataset.lights === "off";
}

function setLights(on) {
  if (on) delete document.documentElement.dataset.lights;
  else document.documentElement.dataset.lights = "off";
  try {
    localStorage.setItem("lights", on ? "on" : "off");
  } catch {}
}

try {
  if (localStorage.getItem("lights") === "off") setLights(false);
} catch {}

// ---------- Remembering ----------

// Within a tab, the theme, the bar's order and Shuffle's order carry over
// between pages (sessionStorage). Refreshing a page starts everything fresh.
if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
  try {
    for (const key of ["theme", "bar", "shuffle"]) sessionStorage.removeItem(key);
  } catch {}
}

// ---------- Theme ----------

// The theme is a random M&M character (never the same one twice in a row).
// Its color is set once as the --theme CSS variable, which style.css uses for
// the text selection, and it's also the favicon and the cursor. The home page
// also draws the character (script.js).
const CHARACTERS = [
  { src: "assets/mnms/red.webp",    color: "#E2231A" },
  { src: "assets/mnms/yellow.webp", color: "#FFD200" },
  { src: "assets/mnms/orange.webp", color: "#F58220" },
  { src: "assets/mnms/purple.webp", color: "#6750A4" },
  { src: "assets/mnms/green.webp",  color: "#4AA942" },
  { src: "assets/mnms/brown.webp",  color: "#6B3E26" },
  { src: "assets/mnms/blue.webp",   color: "#0073CF" },
];

let theme;

function pickTheme() {
  const others = CHARACTERS.filter((c) => c !== theme);
  setTheme(others[Math.floor(Math.random() * others.length)]);
}

// Pages open with the theme picked last in this tab, so moving between them
// (or coming back) doesn't change it. A new tab or a refresh starts with a
// random one, and Shuffle picks a new one.
function keepTheme() {
  let saved;
  try {
    saved = CHARACTERS.find((c) => c.color === sessionStorage.getItem("theme"));
  } catch {}
  if (saved) setTheme(saved);
  else pickTheme();
}

function setTheme(character) {
  theme = character;
  try {
    sessionStorage.setItem("theme", theme.color);
  } catch {}

  document.documentElement.style.setProperty("--theme", theme.color);
  setFavicon(theme.color);
  setCursor(theme.color);
}

// A circle in the given color, as an SVG data URL
function dotImage(color, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="${color}"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function setFavicon(color) {
  document.getElementById("favicon").href = dotImage(color, 10);
}

// Cursor: a 20px dot, the same size as the student dots, clicking from its center
function setCursor(color) {
  document.documentElement.style.setProperty("--cursor", `url("${dotImage(color, 20)}") 10 10, auto`);
}

// ---------- Top bar ----------

// Every page has the same bar: a dot for each student (linking to their
// site), one page link (Bulletin Board on the home page, Back on the
// Bulletin Board) and "Typeset in ABC Areal"
function buildBar(data, link) {
  const dots = data.students.map((s, i) => `
    <a class="dot" href="${s.url}" target="_blank" data-index="${i}"
       style="background: ${s.color}" title="${s.name}" aria-label="${s.name}"></a>
  `);

  document.getElementById("bar").innerHTML = dots.join("") + `
    ${link}
    <span id="typeset">Typeset in
      <a class="link" href="${data.site.typeface.url}" target="_blank">${data.site.typeface.name}</a>
    </span>
  `;
}

// The page link on the far left, the dots in the layout's order, and
// "Typeset in" on the far right. The layout is remembered, so the Bulletin
// Board's bar comes out the same as the home page's.
function arrangeBar(layout) {
  const bar = document.getElementById("bar");
  const dots = layout.order.map((i) => bar.querySelector(`.dot[data-index="${i}"]`));

  bar.append(
    document.getElementById("bar-link"),
    ...dots,
    document.getElementById("typeset")
  );
  try {
    sessionStorage.setItem("bar", JSON.stringify(layout));
  } catch {}
  checkBarWrap();
}

function randomBarLayout() {
  const count = document.querySelectorAll("#bar .dot").length;
  return { order: shuffle(Array.from({ length: count }, (_, i) => i)) };
}

// The last arrangement, if there is one and it still fits the students
function savedBarLayout() {
  try {
    const layout = JSON.parse(sessionStorage.getItem("bar"));
    if (layout.order.length === document.querySelectorAll("#bar .dot").length) return layout;
  } catch {}
  return null;
}

// Spread the bar out while it fits on one row; left-align it once it wraps
function checkBarWrap() {
  const bar = document.getElementById("bar");
  const first = bar?.firstElementChild;
  const last = bar?.lastElementChild;
  if (!first) return; // no bar (error page) or not built yet
  bar.classList.toggle("wrapped", last.offsetTop >= first.offsetTop + first.offsetHeight);
}

window.addEventListener("resize", checkBarWrap);
document.fonts.ready.then(checkBarWrap); // text width changes once ABC Areal loads

// ---------- Helpers ----------

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
