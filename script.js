// Load the site data, then build the page from it
fetch("data.json")
  .then((res) => res.json())
  .then((data) => {
    document.title = data.site.title;
    renderCourse(data);
    renderStudents(data);
    renderBar(data);
    startClock(data.location);
    loadWeather(data.location);
    pickTheme();

    document.getElementById("shuffle").addEventListener("click", () => shuffleEverything(data));
  })
  .catch(showLoadError);

// If data.json can't load: a full-page M&M with a message on top
function showLoadError() {
  document.body.className = "error";
  document.body.innerHTML = `
    <p class="load-error">Something went wrong. Please try refreshing.</p>
    <canvas class="mnm mnm-full" id="mnm" role="img" aria-label="An M&amp;M character"></canvas>
  `;
  pickTheme();
}

// Reorders the student list, the course info rows, the weather lines,
// the goals and the bar dots, and picks a new theme
function shuffleEverything(data) {
  for (const el of [
    document.getElementById("students"),
    document.getElementById("course"),
    document.getElementById("now"),
  ]) {
    shuffle([...el.children]).forEach((child) => el.appendChild(child));
  }
  renderGoals(shuffle([...data.goals]));
  shuffleBar();
  pickTheme();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ---------- Theme ----------

// The theme is a random M&M character (never the same one twice in a row).
// Its color is set once as the --theme CSS variable, which style.css uses for
// the text selection and the shuffle button's dot, and it's also the favicon.
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
  theme = others[Math.floor(Math.random() * others.length)];

  document.documentElement.style.setProperty("--theme", theme.color);
  setFavicon(theme.color);
  loadCharacter(theme);
}

// Favicon: a circle in the given color
function setFavicon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="${color}"/></svg>`;
  document.getElementById("favicon").href = "data:image/svg+xml," + encodeURIComponent(svg);
}

// ---------- Left column ----------

function renderCourse(data) {
  const c = data.course;

  document.getElementById("course").innerHTML = `
    <div class="row"><span>${c.name}</span><span>${c.term}</span></div>
    <div class="row"><span>${c.section}</span><span>${c.nickname}</span></div>
    <div class="row"><span>${c.day}</span><span>${c.time}</span></div>
    <div class="row"><span>${c.location}</span><span>${c.room}</span></div>
  `;

  document.getElementById("description").textContent = data.description;
  renderGoals(data.goals);
  const school = document.getElementById("school");
  school.textContent = data.site.school.name;
  school.href = data.site.school.url;
}

// Each goal links to a Google search of its own text.
// Whichever goal ends up first gets a capital letter.
function renderGoals(goals) {
  const links = goals
    .map((goal, i) => {
      const text = i === 0 ? goal[0].toUpperCase() + goal.slice(1) : goal;
      return `<a href="https://www.google.com/search?q=${encodeURIComponent(goal)}" target="_blank">${text}</a>`;
    })
    .join(", ");
  document.getElementById("goals").innerHTML = `Other goals: ${links}.`;
}

// ---------- Middle column ----------

function renderStudents(data) {
  document.getElementById("students").innerHTML = data.students
    .map((s, i) => `
      <li data-index="${i}">
        <a href="${s.url}" target="_blank">
          ${s.name}
          <span class="dot" style="background: ${s.color}"></span>
        </a>
      </li>
    `)
    .join("");

  const t = data.instructor;
  document.getElementById("instructor").innerHTML = `
    <span>Taught by <a href="${t.url}" target="_blank">${t.name}</a></span>
    <a class="email" href="mailto:${t.email}">
      <span class="dot" style="background: ${t.color}"></span>Email
    </a>
  `;
}

// ---------- Top bar ----------

function renderBar(data) {
  // Every student gets a dot
  const dots = data.students.map((s, i) => `
    <a class="dot" href="${s.url}" target="_blank" data-index="${i}"
       style="background: ${s.color}" title="${s.name}" aria-label="${s.name}"></a>
  `);

  const bar = document.getElementById("bar");
  bar.innerHTML = dots.join("") + `
    <a class="link" id="bulletin" href="${data.site.bulletinBoard}" target="_blank">Bulletin Board</a>
    <span id="typeset">Typeset in
      <a class="link" href="${data.site.typeface.url}" target="_blank">${data.site.typeface.name}</a>
    </span>
  `;
  shuffleBar();

  // Hovering a student's row or their bar dot highlights that student in both places
  const list = document.getElementById("students");
  list.querySelectorAll("li").forEach((li) => {
    const dot = bar.querySelector(`.dot[data-index="${li.dataset.index}"]`);

    function highlight(on) {
      list.classList.toggle("has-highlight", on);
      li.classList.toggle("highlight", on);
      dot.classList.toggle("highlight", on);
    }

    [li, dot].forEach((el) => {
      el.addEventListener("mouseenter", () => highlight(true));
      el.addEventListener("mouseleave", () => highlight(false));
    });
  });
}

// Shuffles the dots and splits them into three random groups (at least one each):
// dots, Bulletin Board, dots, Typeset in ABC Areal, dots
function shuffleBar() {
  const bar = document.getElementById("bar");
  const dots = shuffle([...bar.querySelectorAll(".dot")]);

  // Pick two different cut points between the dots
  const positions = Array.from({ length: dots.length - 1 }, (_, i) => i + 1);
  const [a, b] = shuffle(positions).slice(0, 2).sort((x, y) => x - y);

  bar.append(
    ...dots.slice(0, a),
    document.getElementById("bulletin"),
    ...dots.slice(a, b),
    document.getElementById("typeset"),
    ...dots.slice(b)
  );
  checkBarWrap();
}

// Spread the bar out while it fits on one row; left-align it once it wraps
function checkBarWrap() {
  const bar = document.getElementById("bar");
  const first = bar.firstElementChild;
  const last = bar.lastElementChild;
  if (!first) return; // bar not built yet
  bar.classList.toggle("wrapped", last.offsetTop >= first.offsetTop + first.offsetHeight);
}

window.addEventListener("resize", checkBarWrap);
document.fonts.ready.then(checkBarWrap); // text width changes once ABC Areal loads

// ---------- Right column: M&M character ----------

// The theme's character, dithered in its own color plus grayscale,
// with each pixel drawn as a dot
const BOX_W = 140; // the character box, in desktop px
const BOX_H = 190;
const DOT = 2;     // size of each dot, in desktop px

let characterImage;

function loadCharacter(character) {
  const img = new Image();
  img.onload = () => {
    characterImage = img;
    renderCharacter();
  };
  img.src = character.src;
}

// Redrawn on resize so the dots stay sharp at any size (e.g. full width on mobile)
window.addEventListener("resize", renderCharacter);

function renderCharacter() {
  if (!characterImage) return;
  const img = characterImage;

  // The character's color, a darker shade and a lighter tint of it, plus grays
  const color = [1, 3, 5].map((i) => parseInt(theme.color.slice(i, i + 2), 16));
  const mix = (target, amount) => color.map((c) => c + (target - c) * amount);
  const grays = [0, 51, 102, 153, 204, 255].map((v) => [v, v, v]);
  const palette = [color, mix(0, 0.45), mix(255, 0.45), ...grays];

  // 1. Shrink the character to one pixel per dot (fit inside the box) and dither it
  const fit = Math.min(BOX_W / img.width, BOX_H / img.height);
  const cols = Math.round(img.width * fit / DOT);
  const rows = Math.round(img.height * fit / DOT);
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const smallCtx = small.getContext("2d");
  smallCtx.imageSmoothingQuality = "high";
  smallCtx.drawImage(img, 0, 0, cols, rows);
  const pixels = smallCtx.getImageData(0, 0, cols, rows);
  dither(pixels, palette);

  // 2. Draw each dithered pixel as a circle, at full screen resolution
  const canvas = document.getElementById("mnm");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
  const ctx = canvas.getContext("2d");

  const scale = Math.min(canvas.width / BOX_W, canvas.height / BOX_H);
  const size = DOT * scale;                      // dot size in canvas pixels
  const left = (canvas.width - cols * size) / 2; // centered...
  const top = canvas.height - rows * size;       // ...standing on the bottom

  const { data } = pixels;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const isWhite = data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255;
      if (data[i + 3] === 0 || isWhite) continue;

      ctx.fillStyle = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
      ctx.beginPath();
      ctx.arc(left + (x + 0.5) * size, top + (y + 0.5) * size, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Floyd–Steinberg dithering: snap each pixel to the nearest palette color
// and push the leftover error onto the pixels that haven't been drawn yet
function dither({ data, width, height }, palette) {
  // Flatten semi-transparent edges onto white, working in floats
  const buf = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    for (let c = 0; c < 3; c++) buf[i + c] = data[i + c] * a + 255 * (1 - a);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) {
        data[i + 3] = 0;
        continue;
      }

      const old = [buf[i], buf[i + 1], buf[i + 2]];
      let best = palette[0];
      let bestDist = Infinity;
      for (const color of palette) {
        const dist = (old[0] - color[0]) ** 2 + (old[1] - color[1]) ** 2 + (old[2] - color[2]) ** 2;
        if (dist < bestDist) {
          best = color;
          bestDist = dist;
        }
      }

      data[i] = best[0];
      data[i + 1] = best[1];
      data[i + 2] = best[2];
      data[i + 3] = 255;

      const spread = (dx, dy, amount) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny >= height) return;
        const j = (ny * width + nx) * 4;
        for (let c = 0; c < 3; c++) buf[j + c] += (old[c] - best[c]) * amount;
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);
    }
  }
}

// ---------- Right column: clock ----------

function startClock(location) {
  document.getElementById("place").textContent = location.name;

  function tick() {
    const now = new Date();
    const zone = location.timeZone;

    // e.g. "Sun Oct 4"
    document.getElementById("date").textContent = now
      .toLocaleDateString("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric" })
      .replace(",", "");

    // e.g. "8:52 PM"
    document.getElementById("time").textContent = now
      .toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  }

  tick();
  setInterval(tick, 1000);
}

// ---------- Right column: weather (open-meteo.com, no API key needed) ----------

function loadWeather(location) {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${location.latitude}&longitude=${location.longitude}`
    + "&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit";

  fetch(url)
    .then((res) => res.json())
    .then((json) => {
      const f = json.current.temperature_2m;
      const c = (f - 32) * 5 / 9;
      document.getElementById("weather").textContent = describeWeather(json.current.weather_code, json.current.is_day);
      document.getElementById("temp").textContent = `${Math.round(f)}°F / ${Math.round(c)}°C`;
    })
    .catch(() => {
      document.getElementById("weather").textContent = "--";
      document.getElementById("temp").textContent = "--";
    });
}

// Turns open-meteo's WMO weather codes into a word
function describeWeather(code, isDay) {
  if (code === 0) return isDay ? "Sunny" : "Clear";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow Showers";
  return "Thunderstorms";
}
