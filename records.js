const state = {
  data: null,
  query: "",
  section: "",
  condition: "",
  letter: ""
};

const list = document.querySelector("#recordList");
const count = document.querySelector("#visibleCount");
const note = document.querySelector("#catalogNote");
const search = document.querySelector("#recordSearch");
const sectionFilter = document.querySelector("#sectionFilter");
const conditionFilter = document.querySelector("#conditionFilter");
const letterFilter = document.querySelector("#letterFilter");

function normalized(value) {
  return (value || "").toLocaleLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sectionLabel(key) {
  return state.data.sections[key]?.label || key;
}

function renderLetters() {
  const letters = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  letterFilter.innerHTML = letters.map(letter => {
    const label = letter || "All";
    const active = state.letter === letter ? " is-active" : "";
    return `<button class="letter-button${active}" type="button" data-letter="${letter}">${label}</button>`;
  }).join("");
}

function entryMatches(entry) {
  if (state.section && entry.section !== state.section) return false;
  if (state.condition && !entry.condition.includes(state.condition)) return false;
  if (state.letter && entry.letter !== state.letter) return false;

  if (state.query) {
    const haystack = normalized([
      entry.title,
      entry.artist,
      entry.sourceText,
      entry.condition.join(" "),
      sectionLabel(entry.section)
    ].join(" "));
    if (!haystack.includes(normalized(state.query))) return false;
  }
  return true;
}

function renderEntry(entry) {
  const title = entry.title || entry.sourceText;
  const artist = entry.artist ? `<p class="record-artist">${escapeHtml(entry.artist)}</p>` : "";
  const conditions = entry.condition.map(item =>
    `<span class="condition-badge condition-${escapeHtml(item)}">${escapeHtml(item)}</span>`
  ).join("");
  const review = entry.parseConfidence === "low"
    ? `<span class="review-badge" title="Title/artist split needs review">source-only</span>`
    : "";

  return `
    <article class="record-card">
      <div class="record-card-main">
        <div class="record-meta">
          <span>${escapeHtml(sectionLabel(entry.section))}</span>
          ${entry.letter ? `<span>${escapeHtml(entry.letter)}</span>` : ""}
          ${review}
          ${conditions}
        </div>
        <h2>${escapeHtml(title)}</h2>
        ${artist}
      </div>
      <details class="source-details">
        <summary>Source wording</summary>
        <p>${escapeHtml(entry.sourceText)}</p>
      </details>
    </article>`;
}

function render() {
  const filtered = state.data.entries.filter(entryMatches);
  count.textContent = filtered.length.toLocaleString();

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><strong>No matches.</strong><span>Try clearing a filter or searching the source wording.</span></div>`;
    return;
  }

  list.innerHTML = filtered.map(renderEntry).join("");
}

async function init() {
  const response = await fetch("data/records.json");
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  state.data = await response.json();

  Object.entries(state.data.sections).forEach(([key, section]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = section.label;
    sectionFilter.append(option);
  });

  renderLetters();
  note.textContent = "Structured from Mom's August 2026 list. Open ‘Source wording’ on any entry to compare the transcription.";
  render();
}

search.addEventListener("input", event => {
  state.query = event.target.value.trim();
  render();
});

sectionFilter.addEventListener("change", event => {
  state.section = event.target.value;
  if (state.section && state.section !== "main45") {
    state.letter = "";
    renderLetters();
  }
  render();
});

conditionFilter.addEventListener("change", event => {
  state.condition = event.target.value;
  render();
});

letterFilter.addEventListener("click", event => {
  const button = event.target.closest("[data-letter]");
  if (!button) return;
  state.letter = button.dataset.letter;
  if (state.letter) {
    state.section = "main45";
    sectionFilter.value = "main45";
  }
  renderLetters();
  render();
});

init().catch(error => {
  console.error(error);
  note.textContent = "The catalog could not be loaded.";
  list.innerHTML = `<div class="empty-state"><strong>Catalog unavailable.</strong><span>Reload the page or check the data file.</span></div>`;
});
