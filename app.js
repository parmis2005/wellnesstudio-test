const monthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const weekdayNames = ["M", "D", "M", "D", "F", "S", "S"];
const availabilityLevels = {
  available: "available",
  short: "short",
  none: "none",
};

const filterConfig = {
  location: ["Düsseldorf Heerdt", "Düsseldorf Oberkassel", "Düsseldorf Medienhafen"],
  guests: ["1 Person", "2 Personen", "3 Personen", "4 Personen"],
  duration: ["90 Minuten", "2 Stunden", "3 Stunden"],
  suite: ["Alle", "Private Spa", "Massage Suite", "Recovery Lounge"],
};

const state = {
  startMonthOffset: 0,
  selectedDate: null,
  filters: {
    location: 0,
    guests: 1,
    duration: 1,
    suite: 0,
  },
};

const calendarGrid = document.querySelector("#calendarGrid");
const selectionHint = document.querySelector("#selectionHint");
const filterButtons = Array.from(document.querySelectorAll(".filter-chip"));

function pad(num) {
  return String(num).padStart(2, "0");
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthLabel(date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function isInMonth(date, monthDate) {
  return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
}

function currentAvailability(date) {
  const iso = toIso(date);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (year === 2026 && month === 5) {
    if ([18, 19, 20, 27].includes(day)) return availabilityLevels.short;
    if (day >= 21 && day <= 30) return availabilityLevels.available;
    return availabilityLevels.none;
  }

  if (
    (year === 2026 && month === 6) ||
    (year === 2026 && month === 7)
  ) {
    return availabilityLevels.available;
  }

  // For any other month, provide a gentle, bookable pattern.
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 2 || dayOfWeek === 4) return availabilityLevels.short;
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return availabilityLevels.available;
  return availabilityLevels.none;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthDaysGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const startDay = (first.getDay() + 6) % 7;
  const last = endOfMonth(monthDate);
  const days = [];

  const prev = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0);
  for (let i = startDay; i > 0; i -= 1) {
    days.push(new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - (i - 1)));
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    const lastDay = days[days.length - 1];
    days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
  }

  return days;
}

function arrowIcon(direction) {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="${direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"}" />
    </svg>
  `;
}

function renderCalendar() {
  const base = new Date(2026, 5 + state.startMonthOffset, 1);
  const months = [0, 1, 2].map((offset) => new Date(base.getFullYear(), base.getMonth() + offset, 1));

  calendarGrid.innerHTML = months
    .map((monthDate, index) => {
      const days = monthDaysGrid(monthDate);
      const dayCells = days
        .map((dayDate) => {
          const inMonth = isInMonth(dayDate, monthDate);
          const iso = toIso(dayDate);
          const availability = inMonth ? currentAvailability(dayDate) : availabilityLevels.none;
          const classes = ["day-cell"];

          if (!inMonth) {
            classes.push("muted");
          } else if (availability === availabilityLevels.available) {
            classes.push("available");
          } else if (availability === availabilityLevels.short) {
            classes.push("short");
          }

          if (state.selectedDate === iso) {
            classes.push("selected");
          }

          const content = inMonth ? dayDate.getDate() : dayDate.getDate();

          return `
            <button
              type="button"
              class="${classes.join(" ")}"
              ${inMonth && availability !== availabilityLevels.none ? `data-date="${iso}"` : "tabindex=-1"}
              aria-label="${inMonth ? dateLabel(dayDate) : "Vormonat / Folgemonat"}"
            >
              ${content}
            </button>
          `;
        })
        .join("");

      return `
        <article class="month-card">
          <div class="month-head">
            <strong>${monthLabel(monthDate)}</strong>
            <div class="month-nav">
              <button type="button" class="nav-btn" data-nav="prev" aria-label="Vorherige Monate">
                ${arrowIcon("left")}
              </button>
              <button type="button" class="nav-btn" data-nav="next" aria-label="Nächste Monate">
                ${arrowIcon("right")}
              </button>
            </div>
          </div>
          <div class="weekday-row">
            ${weekdayNames.map((day) => `<span>${day}</span>`).join("")}
          </div>
          <div class="day-grid">
            ${dayCells}
          </div>
        </article>
      `;
    })
    .join("");

  calendarGrid.querySelectorAll(".day-cell[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      renderCalendar();
      updateHint();
    });
  });

  calendarGrid.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.startMonthOffset += button.dataset.nav === "next" ? 1 : -1;
      renderCalendar();
      updateHint();
    });
  });
}

function updateHint() {
  if (!state.selectedDate) {
    selectionHint.textContent = "Mindestens einen Tag auswählen";
    return;
  }

  selectionHint.textContent = `Ausgewählt: ${dateLabel(fromIso(state.selectedDate))}`;
}

function updateFilters() {
  filterButtons.forEach((button) => {
    const key = button.dataset.filter;
    const value = filterConfig[key][state.filters[key]];
    const strong = button.querySelector("strong");
    if (strong) strong.textContent = value;
  });
}

function initFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.filter;
      state.filters[key] = (state.filters[key] + 1) % filterConfig[key].length;
      updateFilters();
    });
  });
}

updateFilters();
initFilters();
renderCalendar();
updateHint();
