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
    restoreShuffle(data);
    keepTheme();
    loadCharacter(theme);

    document.getElementById("shuffle").addEventListener("click", () => shuffleEverything(data));

    const lights = document.getElementById("lights");
    lights.setAttribute("aria-pressed", lightsOff());
    lights.addEventListener("click", () => {
      setLights(lightsOff());
      lights.setAttribute("aria-pressed", lightsOff());
      renderCharacter(); // its white dots only show with the lights off
    });
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
  loadCharacter(theme);
}

// The lists Shuffle reorders. Each item is known by its id or data-index
const SHUFFLED_LISTS = ["students", "course", "now"];
const itemKey = (el) => el.id || el.dataset.index;

// Reorders the student list, the course info rows, the weather lines,
// the goals and the bar dots, and picks a new theme
function shuffleEverything(data) {
  for (const id of SHUFFLED_LISTS) {
    const el = document.getElementById(id);
    shuffle([...el.children]).forEach((child) => el.appendChild(child));
  }
  const goals = shuffle([...data.goals]);
  renderGoals(goals);
  shuffleBar();
  pickTheme();
  loadCharacter(theme);
  saveShuffle(goals);
}

// The shuffled order is remembered for this tab (like the theme and the bar),
// so coming back from the Bulletin Board shows the page as you left it.
// Refreshing starts over (shared.js)
function saveShuffle(goals) {
  const order = { goals };
  for (const id of SHUFFLED_LISTS) {
    order[id] = [...document.getElementById(id).children].map(itemKey);
  }
  try {
    sessionStorage.setItem("shuffle", JSON.stringify(order));
  } catch {}
}

function restoreShuffle(data) {
  let order;
  try {
    order = JSON.parse(sessionStorage.getItem("shuffle"));
  } catch {}
  if (!order) return;

  for (const id of SHUFFLED_LISTS) {
    const el = document.getElementById(id);
    const items = new Map([...el.children].map((child) => [itemKey(child), child]));
    for (const key of order[id] || []) {
      if (items.has(key)) el.appendChild(items.get(key));
    }
  }
  // Only if they're still the same goals (data.json may have changed)
  const sameGoals = order.goals?.length === data.goals.length
    && data.goals.every((goal) => order.goals.includes(goal));
  if (sameGoals) renderGoals(order.goals);
}

// ---------- Left column ----------

function renderCourse(data) {
  const c = data.course;

  document.getElementById("course").innerHTML = `
    <div class="row" data-index="0"><span>${c.name}</span><span>${c.term}</span></div>
    <div class="row" data-index="1"><span>${c.section}</span><span>${c.nickname}</span></div>
    <div class="row" data-index="2"><span>${c.day}</span><span>${c.time}</span></div>
    <div class="row" data-index="3"><span>${c.location}</span><span>${c.room}</span></div>
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
  // Names link nowhere for now (each student's site is still s.url in data.json)
  document.getElementById("students").innerHTML = data.students
    .map((s, i) => `
      <li data-index="${i}">
        <a href="#">
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
  buildBar(data, `<a class="link" id="bar-link" href="bulletin.html">Bulletin Board</a>`);
  arrangeBar(savedBarLayout() || randomBarLayout());

  // Hovering a student's row or their bar dot highlights that student in both places
  const list = document.getElementById("students");
  list.querySelectorAll("li").forEach((li) => {
    const dot = document.querySelector(`#bar .dot[data-index="${li.dataset.index}"]`);

    function highlight(on) {
      li.classList.toggle("highlight", on);
      dot.classList.toggle("highlight", on);
    }

    [li, dot].forEach((el) => {
      el.addEventListener("mouseenter", () => highlight(true));
      el.addEventListener("mouseleave", () => highlight(false));
    });
  });
}

// A new random arrangement of the bar (remembered for the Bulletin Board)
function shuffleBar() {
  arrangeBar(randomBarLayout());
}

// ---------- Right column: M&M character ----------

// The theme's character, dithered in its own color plus grayscale,
// with each pixel drawn as a dot
const BOX_W = 140; // the character box, in desktop px
const BOX_H = 190;
const DOT = 2;     // size of each dot, in desktop px

let characterImage;

// The old character disappears the moment a new one is picked, leaving the
// empty box as a placeholder until the new image loads
function loadCharacter(character) {
  characterImage = null;
  const canvas = document.getElementById("mnm");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.onload = () => {
    if (character !== theme) return; // already shuffled again while this loaded
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
      // White dots are left out on the light paper (they'd look like holes),
      // but drawn with the lights off, where they're the gloves and eyes
      const isWhite = data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255;
      if (data[i + 3] === 0 || (isWhite && !lightsOff())) continue;

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
