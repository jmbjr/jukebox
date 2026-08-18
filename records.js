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

function unpackEntry(row, index) {
  const [section, letter, title, artist, conditionText, sourceText, needsReview] = row;
  const condition = conditionText ? conditionText.split(",").filter(Boolean) : [];
  return {
    id: `r${String(index + 1).padStart(4, "0")}`,
    section,
    letter,
    title,
    artist,
    condition,
    sourceText: sourceText || [title, artist].filter(Boolean).join(" — "),
    needsReview: Boolean(needsReview)
  };
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
  const review = entry.needsReview
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

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Catalog request failed for ${url}: ${response.status}`);
  return response.json();
}

async function init() {
  const manifest = await loadJson("data/records.json");
  const chunks = await Promise.all(manifest.files.map(loadJson));
  const entries = chunks.flat().map(unpackEntry);

  if (entries.length !== manifest.entryCount) {
    throw new Error(`Catalog count mismatch: expected ${manifest.entryCount}, received ${entries.length}`);
  }

  state.data = { ...manifest, entries };

  Object.entries(state.data.sections).forEach(([key, section]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = section.label;
    sectionFilter.append(option);
  });

  renderLetters();
  note.textContent = `${entries.length.toLocaleString()} source entries from Mom's August 2026 list. “Source-only” marks rows whose title/artist split still needs a human check.`;
  render();
}

search.addEventListener("input", event => {
  state.query = event.target.value.trim();
  render();
});

sectionFilter.addEventListener("change", event => {
  state.section = event.target.value;
  if (state.section && state.section !== "m") {
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
    state.section = "m";
    sectionFilter.value = "m";
  }
  renderLetters();
  render();
});

init().catch(error => {
  console.error(error);
  note.textContent = "The catalog could not be loaded.";
  list.innerHTML = `<div class="empty-state"><strong>Catalog unavailable.</strong><span>Reload the page or check the data files.</span></div>`;
});
