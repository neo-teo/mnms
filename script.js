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

    // Shuffle button reorders the student list, the goals and the bar dots
    document.getElementById("shuffle").addEventListener("click", () => {
      const list = document.getElementById("students");
      shuffle([...list.children]).forEach((li) => list.appendChild(li));
      renderGoals(shuffle([...data.goals]));
      shuffleBar();
    });
  });

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
       style="background: ${s.color}" title="${s.name}"></a>
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

// Shuffles the dots, keeping the design's arrangement:
// 3 dots, Bulletin Board, dots, Typeset in ABC Areal, last dot
function shuffleBar() {
  const bar = document.getElementById("bar");
  const dots = shuffle([...bar.querySelectorAll(".dot")]);
  bar.append(
    ...dots.slice(0, 3),
    document.getElementById("bulletin"),
    ...dots.slice(3, -1),
    document.getElementById("typeset"),
    dots[dots.length - 1]
  );
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
