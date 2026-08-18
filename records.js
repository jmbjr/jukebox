const state = {
  data: null,
  query: "",
  artist: "",
  section: "",
  condition: "",
  slotFilter: "",
  letter: ""
};

const list = document.querySelector("#recordList");
const count = document.querySelector("#visibleCount");
const note = document.querySelector("#catalogNote");
const search = document.querySelector("#recordSearch");
const sectionFilter = document.querySelector("#sectionFilter");
const conditionFilter = document.querySelector("#conditionFilter");
const slotFilter = document.querySelector("#slotFilter");
const letterFilter = document.querySelector("#letterFilter");
const summary = document.querySelector(".catalog-summary");

const artistView = document.createElement("section");
artistView.className = "artist-view";
artistView.hidden = true;
artistView.setAttribute("aria-live", "polite");
summary.before(artistView);

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

function unpackEntry(row, index, slotAssignments) {
  const [section, letter, title, artist, conditionText, sourceText, needsReview] = row;
  const id = `r${String(index + 1).padStart(4, "0")}`;
  const condition = conditionText ? conditionText.split(",").filter(Boolean) : [];
  const assignment = slotAssignments[id] || null;

  return {
    id,
    section,
    letter,
    title,
    artist,
    condition,
    sourceText: sourceText || [title, artist].filter(Boolean).join(" — "),
    needsReview: Boolean(needsReview),
    slot: assignment?.slot || "",
    location: assignment?.location || ""
  };
}

function artistUrl(artist) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("artist", artist);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function syncUrl({ replace = false } = {}) {
  const url = new URL(window.location.href);
  if (state.artist) url.searchParams.set("artist", state.artist);
  else url.searchParams.delete("artist");

  const method = replace ? "replaceState" : "pushState";
  history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function renderArtistView() {
  if (!state.artist) {
    artistView.hidden = true;
    artistView.innerHTML = "";
    return;
  }

  artistView.hidden = false;
  artistView.innerHTML = `
    <div>
      <span>Artist</span>
      <strong>${escapeHtml(state.artist)}</strong>
    </div>
    <button type="button" data-clear-artist>Show all records</button>`;
}

function resetOtherFilters() {
  state.query = "";
  state.section = "";
  state.condition = "";
  state.slotFilter = "";
  state.letter = "";
  search.value = "";
  sectionFilter.value = "";
  conditionFilter.value = "";
  slotFilter.value = "";
  renderLetters();
}

function selectArtist(artist, { push = true } = {}) {
  state.artist = artist;
  resetOtherFilters();
  renderArtistView();
  if (push) syncUrl();
  render();
  window.scrollTo({ top: artistView.offsetTop - 18, behavior: "smooth" });
}

function clearArtist({ push = true } = {}) {
  state.artist = "";
  renderArtistView();
  if (push) syncUrl();
  render();
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
  if (state.artist && normalized(entry.artist) !== normalized(state.artist)) return false;
  if (state.section && entry.section !== state.section) return false;
  if (state.condition && !entry.condition.includes(state.condition)) return false;
  if (state.letter && entry.letter !== state.letter) return false;
  if (state.slotFilter === "assigned" && !entry.slot) return false;
  if (state.slotFilter === "unassigned" && entry.slot) return false;

  if (state.query) {
    const haystack = normalized([
      entry.title,
      entry.artist,
      entry.sourceText,
      entry.slot,
      entry.location,
      entry.condition.join(" "),
      sectionLabel(entry.section)
    ].join(" "));
    if (!haystack.includes(normalized(state.query))) return false;
  }
  return true;
}

function renderEntry(entry) {
  const title = entry.title || entry.sourceText;
  const artist = entry.artist || "Artist not yet separated";
  const slot = entry.slot || "—";
  const slotClass = entry.slot ? "" : " is-unassigned";
  const conditions = entry.condition.map(item =>
    `<span class="condition-badge condition-${escapeHtml(item)}">${escapeHtml(item)}</span>`
  ).join("");
  const review = entry.needsReview
    ? `<span class="review-badge" title="Title/artist split needs review">source-only</span>`
    : "";
  const artistMarkup = entry.artist
    ? `<a class="record-artist" href="${escapeHtml(artistUrl(entry.artist))}" data-artist="${escapeHtml(entry.artist)}">${escapeHtml(entry.artist)}</a>`
    : `<p class="record-artist is-unknown">${escapeHtml(artist)}</p>`;

  return `
    <article class="record-card" data-record-id="${escapeHtml(entry.id)}">
      <div class="title-strip">
        <div class="slot-panel">
          <span class="slot-label">Selection</span>
          <strong class="slot-value${slotClass}">${escapeHtml(slot)}</strong>
        </div>
        <div class="strip-copy">
          <h2>${escapeHtml(title)}</h2>
          ${artistMarkup}
          <div class="strip-footer">
            <span>${escapeHtml(sectionLabel(entry.section))}</span>
            ${entry.letter ? `<span>${escapeHtml(entry.letter)}</span>` : ""}
            ${entry.location ? `<span>${escapeHtml(entry.location)}</span>` : ""}
          </div>
        </div>
      </div>
      <details class="record-details">
        <summary>Catalog details${review}${conditions}</summary>
        <div class="record-details-body">
          <p><strong>Record ID:</strong> ${escapeHtml(entry.id)} · <strong>Jukebox slot:</strong> ${entry.slot ? escapeHtml(entry.slot) : "Unassigned"}</p>
          <p><strong>Source wording:</strong> ${escapeHtml(entry.sourceText)}</p>
        </div>
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
  const [manifest, slots] = await Promise.all([
    loadJson("data/records.json"),
    loadJson("data/record-slots.json")
  ]);
  const chunks = await Promise.all(manifest.files.map(loadJson));
  const entries = chunks.flat().map((row, index) => unpackEntry(row, index, slots.assignments || {}));

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

  const assignedCount = entries.filter(entry => entry.slot).length;
  renderLetters();
  note.textContent = `${entries.length.toLocaleString()} source entries · ${assignedCount.toLocaleString()} currently mapped to jukebox slots. Click any artist name to see only that artist.`;

  const requestedArtist = new URL(window.location.href).searchParams.get("artist") || "";
  if (requestedArtist) {
    const canonicalArtist = entries.find(entry => normalized(entry.artist) === normalized(requestedArtist))?.artist || requestedArtist;
    state.artist = canonicalArtist;
    renderArtistView();
    syncUrl({ replace: true });
  }

  render();
}

list.addEventListener("click", event => {
  const artistLink = event.target.closest("[data-artist]");
  if (!artistLink) return;
  event.preventDefault();
  selectArtist(artistLink.dataset.artist);
});

artistView.addEventListener("click", event => {
  if (!event.target.closest("[data-clear-artist]")) return;
  clearArtist();
});

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

slotFilter.addEventListener("change", event => {
  state.slotFilter = event.target.value;
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

window.addEventListener("popstate", () => {
  const artist = new URL(window.location.href).searchParams.get("artist") || "";
  state.artist = artist;
  resetOtherFilters();
  renderArtistView();
  render();
});

init().catch(error => {
  console.error(error);
  note.textContent = "The catalog could not be loaded.";
  list.innerHTML = `<div class="empty-state"><strong>Catalog unavailable.</strong><span>Reload the page or check the data files.</span></div>`;
});
