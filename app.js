// Programma Evento — app statica, nessun backend.
// Dato "pubblicato" = data.json nel repo. Le modifiche admin vivono come bozza
// in localStorage finche' non vengono esportate e ri-committate su GitHub.

const DEFAULT_PIN = "0000";
const DRAFT_KEY = "eventoData_draft";
const PIN_KEY = "eventoData_pin";
const TOKEN_KEY = "eventoData_ghToken";

// Repository GitHub dove vive data.json: la pubblicazione dal pannello admin
// scrive direttamente qui tramite l'API GitHub (serve un token, vedi README).
const GH_OWNER = "riccardofaccini9-pixel";
const GH_REPO = "San-Marino";
const GH_BRANCH = "main";
const GH_PATH = "data.json";

// Copia di riserva usata se data.json non e' raggiungibile (es. aperto come file://)
const FALLBACK_DATA = {
  startDate: null,
  people: ["Mario Rossi", "Giulia Bianchi", "Luca Verdi", "Anna Neri"],
  events: []
};

let data = { startDate: null, people: [], events: [] };
let isAdmin = false;
let editingEventId = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);
}

// Data/ora reale di inizio o fine di un evento, calcolata da data.startDate
// (Giorno 1) + offset giorni + orario. Ritorna null se startDate non è impostata.
function eventDateTime(ev, which) {
  if (!data.startDate) return null;
  const dt = new Date(data.startDate + "T00:00:00");
  dt.setDate(dt.getDate() + (Number(ev.day) - 1));
  const [h, m] = ev[which].split(":").map(Number);
  dt.setHours(h, m, 0, 0);
  return dt;
}

function isEventNow(ev) {
  const start = eventDateTime(ev, "start");
  const end = eventDateTime(ev, "end");
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now < end;
}

// ---------- Caricamento dati ----------

async function loadData() {
  const draftRaw = localStorage.getItem(DRAFT_KEY);
  if (draftRaw) {
    try {
      data = JSON.parse(draftRaw);
      return;
    } catch (e) { /* bozza corrotta, ignora */ }
  }
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    data = await res.json();
  } catch (e) {
    data = JSON.parse(JSON.stringify(FALLBACK_DATA));
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

function getPin() {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}

// ---------- Vista pubblica ----------

function renderPersonSelect() {
  const select = $("#personSelect");
  const current = select.value;
  select.innerHTML = '<option value="">Tutti</option>' +
    data.people.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  if (data.people.includes(current)) select.value = current;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function renderPublicView() {
  const container = $("#publicView");
  const selectedPerson = $("#personSelect").value;
  container.innerHTML = "";

  const days = [1, 2, 3];
  let anyEvent = false;

  days.forEach((day) => {
    let dayEvents = data.events
      .filter((ev) => Number(ev.day) === day)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    if (selectedPerson) {
      dayEvents = dayEvents.filter((ev) => ev.participants.includes(selectedPerson));
    }

    if (dayEvents.length === 0) return;
    anyEvent = true;

    const block = document.createElement("div");
    block.className = "day-block";
    block.innerHTML = `<h2 class="day-title">Giorno ${day}</h2>`;

    dayEvents.forEach((ev) => {
      const card = document.createElement("div");
      const now = isEventNow(ev);
      card.className = "event-card" + (now ? " now" : "");
      const tags = ev.participants.map((p) =>
        `<span class="tag ${p === selectedPerson ? "selected" : ""}">${escapeHtml(p)}</span>`
      ).join("");
      card.innerHTML = `
        <div class="event-time">
          <span class="time-range">${ev.start} - ${ev.end}</span>
          ${now ? '<span class="now-badge">IN CORSO</span>' : ""}
        </div>
        <div class="event-main">
          <p class="event-title">${escapeHtml(ev.title)}</p>
          <p class="event-location">📍 ${escapeHtml(ev.location)}</p>
          <div class="event-participants">${tags}</div>
          ${ev.notes ? `<div class="event-notes">⚠ ${escapeHtml(ev.notes)}</div>` : ""}
        </div>
      `;
      block.appendChild(card);
    });

    container.appendChild(block);
  });

  if (!anyEvent) {
    container.innerHTML = '<p class="empty-state">Nessun evento da mostrare.</p>';
  }
}

// ---------- Autenticazione admin ----------

function openPinModal() {
  $("#pinModal").classList.remove("hidden");
  $("#pinError").classList.add("hidden");
  $("#pinInput").value = "";
  $("#pinInput").focus();
}

function closePinModal() {
  $("#pinModal").classList.add("hidden");
}

function enterAdmin() {
  isAdmin = true;
  $("#adminPanel").classList.remove("hidden");
  $("#lockBtn").classList.add("unlocked");
  $("#lockIcon").textContent = "🔓";
  $("#startDateInput").value = data.startDate || "";
  renderAdminPeople();
  renderAdminEvents();
}

function exitAdmin() {
  isAdmin = false;
  $("#adminPanel").classList.add("hidden");
  $("#lockBtn").classList.remove("unlocked");
  $("#lockIcon").textContent = "🔒";
}

// ---------- Admin: tab persone ----------

function renderAdminPeople() {
  const list = $("#peopleList");
  list.innerHTML = data.people.map((p, i) => `
    <li>
      <span>${escapeHtml(p)}</span>
      <button data-index="${i}" class="del-person-btn">Rimuovi</button>
    </li>
  `).join("");

  $$(".del-person-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      const person = data.people[idx];
      const used = data.events.some((ev) => ev.participants.includes(person));
      if (used && !confirm(`"${person}" è assegnata ad almeno un evento. Rimuoverla comunque dall'elenco persone? (resterà negli eventi già creati)`)) {
        return;
      }
      data.people.splice(idx, 1);
      saveDraft();
      renderAdminPeople();
      renderEventParticipantsCheckboxes();
      renderPersonSelect();
      renderPublicView();
    });
  });
}

function addPerson(name) {
  name = name.trim();
  if (!name) return;
  if (data.people.includes(name)) {
    alert("Questa persona è già nell'elenco.");
    return;
  }
  data.people.push(name);
  saveDraft();
  renderAdminPeople();
  renderEventParticipantsCheckboxes();
  renderPersonSelect();
  renderPublicView();
}

// ---------- Admin: tab programma ----------

function renderEventParticipantsCheckboxes(selected = []) {
  const box = $("#eventParticipants");
  if (data.people.length === 0) {
    box.innerHTML = '<span style="color:var(--muted); font-size:0.85rem;">Aggiungi prima delle persone nella scheda "Persone".</span>';
    return;
  }
  box.innerHTML = data.people.map((p) => `
    <label>
      <input type="checkbox" value="${escapeHtml(p)}" ${selected.includes(p) ? "checked" : ""}/>
      ${escapeHtml(p)}
    </label>
  `).join("");
}

function findConflicts() {
  const conflicts = [];
  const byPerson = {};
  data.events.forEach((ev) => {
    ev.participants.forEach((p) => {
      byPerson[p] = byPerson[p] || [];
      byPerson[p].push(ev);
    });
  });

  Object.entries(byPerson).forEach(([person, evs]) => {
    for (let i = 0; i < evs.length; i++) {
      for (let j = i + 1; j < evs.length; j++) {
        const a = evs[i], b = evs[j];
        if (Number(a.day) === Number(b.day) && overlaps(a.start, a.end, b.start, b.end)) {
          conflicts.push({ person, a, b });
        }
      }
    }
  });
  return conflicts;
}

function conflictEventIds(conflicts) {
  const ids = new Set();
  conflicts.forEach((c) => { ids.add(c.a.id); ids.add(c.b.id); });
  return ids;
}

function renderConflicts(conflicts) {
  const box = $("#conflictsBox");
  if (conflicts.length === 0) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `<strong>⚠ Sovrapposizioni rilevate (${conflicts.length})</strong><ul>` +
    conflicts.map((c) => `<li><strong>${escapeHtml(c.person)}</strong>: "${escapeHtml(c.a.title)}" (${c.a.start}-${c.a.end}) e "${escapeHtml(c.b.title)}" (${c.b.start}-${c.b.end}) nel Giorno ${c.a.day}</li>`).join("") +
    "</ul>";
}

function renderAdminEvents() {
  const conflicts = findConflicts();
  renderConflicts(conflicts);
  const conflictIds = conflictEventIds(conflicts);

  const tbody = $("#eventsTable tbody");
  const sorted = [...data.events].sort((a, b) => Number(a.day) - Number(b.day) || timeToMinutes(a.start) - timeToMinutes(b.start));

  tbody.innerHTML = sorted.map((ev) => `
    <tr class="${conflictIds.has(ev.id) ? "conflict-row" : ""}" data-id="${ev.id}">
      <td>${ev.day}</td>
      <td>${ev.start}-${ev.end}</td>
      <td>${escapeHtml(ev.title)}</td>
      <td>${escapeHtml(ev.location)}</td>
      <td>${ev.participants.map(escapeHtml).join(", ")}</td>
      <td>${escapeHtml(ev.notes || "")}</td>
      <td class="row-actions">
        <button class="edit-btn secondary" data-id="${ev.id}">Modifica</button>
        <button class="del-btn" data-id="${ev.id}">Elimina</button>
      </td>
    </tr>
  `).join("");

  $$(".edit-btn").forEach((btn) => btn.addEventListener("click", () => startEditEvent(btn.dataset.id)));
  $$(".del-btn").forEach((btn) => btn.addEventListener("click", () => deleteEvent(btn.dataset.id)));
}

function startEditEvent(id) {
  const ev = data.events.find((e) => e.id === id);
  if (!ev) return;
  editingEventId = id;
  $("#eventId").value = id;
  $("#eventDay").value = ev.day;
  $("#eventStart").value = ev.start;
  $("#eventEnd").value = ev.end;
  $("#eventTitle").value = ev.title;
  $("#eventLocation").value = ev.location;
  $("#eventNotes").value = ev.notes || "";
  renderEventParticipantsCheckboxes(ev.participants);
  $("#eventSubmitBtn").textContent = "Salva modifiche";
  $("#eventCancelBtn").classList.remove("hidden");
  $("#eventForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditEvent() {
  editingEventId = null;
  $("#eventForm").reset();
  $("#eventId").value = "";
  renderEventParticipantsCheckboxes();
  $("#eventSubmitBtn").textContent = "Aggiungi evento";
  $("#eventCancelBtn").classList.add("hidden");
}

function deleteEvent(id) {
  if (!confirm("Eliminare questo evento?")) return;
  data.events = data.events.filter((e) => e.id !== id);
  saveDraft();
  renderAdminEvents();
  renderPublicView();
  if (editingEventId === id) cancelEditEvent();
}

function submitEventForm(e) {
  e.preventDefault();
  const day = Number($("#eventDay").value);
  const start = $("#eventStart").value;
  const end = $("#eventEnd").value;
  const title = $("#eventTitle").value.trim();
  const location = $("#eventLocation").value.trim();
  const notes = $("#eventNotes").value.trim();
  const participants = $$('#eventParticipants input[type="checkbox"]:checked').map((cb) => cb.value);

  if (timeToMinutes(end) <= timeToMinutes(start)) {
    alert("L'orario di fine deve essere successivo all'orario di inizio.");
    return;
  }
  if (participants.length === 0) {
    if (!confirm("Nessun partecipante selezionato per questo evento. Continuare comunque?")) return;
  }

  if (editingEventId) {
    const ev = data.events.find((e2) => e2.id === editingEventId);
    Object.assign(ev, { day, start, end, title, location, notes, participants });
  } else {
    data.events.push({ id: uid(), day, start, end, title, location, notes, participants });
  }

  saveDraft();
  cancelEditEvent();
  renderAdminEvents();
  renderPublicView();
}

// ---------- Export / discard ----------

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function discardDraft() {
  if (!confirm("Scartare tutte le modifiche non esportate e ricaricare i dati pubblicati?")) return;
  localStorage.removeItem(DRAFT_KEY);
  location.reload();
}

// ---------- Pubblicazione diretta su GitHub ----------

function toBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function setPublishStatus(message, isError = false) {
  const box = $("#publishStatus");
  box.textContent = message;
  box.classList.remove("hidden");
  box.classList.toggle("publish-error", isError);
  box.classList.toggle("publish-ok", !isError);
}

async function publishToGithub() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    setPublishStatus('Configura prima il token GitHub qui sotto ("Configura token GitHub").', true);
    return;
  }

  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  };

  setPublishStatus("Pubblicazione in corso...");
  try {
    const getRes = await fetch(`${apiUrl}?ref=${GH_BRANCH}`, { headers });
    if (!getRes.ok) {
      throw new Error(getRes.status === 401 || getRes.status === 403
        ? "Token non valido o senza i permessi necessari."
        : `Impossibile leggere data.json dal repository (HTTP ${getRes.status}).`);
    }
    const current = await getRes.json();

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Aggiornamento programma evento",
        content: toBase64Utf8(JSON.stringify(data, null, 2)),
        sha: current.sha,
        branch: GH_BRANCH
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Errore durante la pubblicazione (HTTP ${putRes.status}).`);
    }

    localStorage.removeItem(DRAFT_KEY);
    setPublishStatus("✅ Pubblicato! Sarà visibile a tutti entro 1-2 minuti.");
  } catch (e) {
    setPublishStatus(`❌ ${e.message}`, true);
  }
}

function saveGithubToken(token) {
  token = token.trim();
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  setPublishStatus("Token salvato in questo browser.");
}

function clearGithubToken() {
  if (!confirm("Rimuovere il token GitHub salvato in questo browser?")) return;
  localStorage.removeItem(TOKEN_KEY);
  setPublishStatus("Token rimosso.");
}

// ---------- Logo ----------

function loadLogo() {
  const img = $("#logo");
  const candidates = ["assets/logo.svg", "assets/logo.png"];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      img.remove();
      return;
    }
    img.src = candidates[i++];
  };
  img.addEventListener("error", tryNext);
  tryNext();
}

// ---------- Init ----------

function setupTabs() {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".tab-content").forEach((tc) => tc.classList.add("hidden"));
      $(`#tab-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });
}

function setupEvents() {
  $("#personSelect").addEventListener("change", renderPublicView);

  $("#lockBtn").addEventListener("click", () => {
    if (isAdmin) return;
    openPinModal();
  });

  $("#logoutBtn").addEventListener("click", exitAdmin);
  $("#pinCancelBtn").addEventListener("click", closePinModal);

  $("#pinForm2").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = $("#pinInput").value;
    if (value === getPin()) {
      closePinModal();
      enterAdmin();
    } else {
      $("#pinError").classList.remove("hidden");
    }
  });

  $("#addPersonForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addPerson($("#newPersonName").value);
    $("#newPersonName").value = "";
  });

  $("#eventForm").addEventListener("submit", submitEventForm);
  $("#eventCancelBtn").addEventListener("click", cancelEditEvent);

  $("#startDateInput").addEventListener("change", (e) => {
    data.startDate = e.target.value || null;
    saveDraft();
    renderPublicView();
  });

  $("#exportBtn").addEventListener("click", exportData);
  $("#discardBtn").addEventListener("click", discardDraft);
  $("#publishBtn").addEventListener("click", publishToGithub);

  $("#tokenForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveGithubToken($("#ghTokenInput").value);
    $("#ghTokenInput").value = "";
  });
  $("#clearTokenBtn").addEventListener("click", clearGithubToken);

  $("#pinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const newPin = $("#newPin").value;
    if (!/^\d{4}$/.test(newPin)) {
      alert("Il PIN deve essere composto da 4 cifre.");
      return;
    }
    localStorage.setItem(PIN_KEY, newPin);
    $("#newPin").value = "";
    alert("PIN aggiornato.");
  });
}

async function init() {
  loadLogo();
  await loadData();
  renderPersonSelect();
  renderPublicView();
  renderEventParticipantsCheckboxes();
  setupTabs();
  setupEvents();
  setInterval(renderPublicView, 30000);
}

init();
