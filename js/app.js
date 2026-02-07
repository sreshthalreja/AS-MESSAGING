/*
  Letters for Us - Client App
  Place a couple photo at /assets/couple.jpg.
  Messages are loaded from /data/messages.json.
*/

const landing = document.getElementById("landing");
const app = document.getElementById("app");
const enterBtn = document.getElementById("enterBtn");
const grid = document.getElementById("grid");
const emptyState = document.getElementById("emptyState");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalEvent = document.getElementById("modalEvent");
const modalDate = document.getElementById("modalDate");
const modalMessage = document.getElementById("modalMessage");

const LAST_VISIT_KEY = "letters_last_visit";

enterBtn.addEventListener("click", () => {
  landing.classList.add("hidden");
  app.classList.remove("hidden");
  app.scrollIntoView({ behavior: "smooth" });
});

modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

function closeModal() {
  modal.classList.add("hidden");
}

function openModal(message) {
  modalImage.src = message.imageUrl;
  modalTitle.textContent = message.title || "Untitled";
  modalEvent.textContent = message.eventName ? `Event: ${message.eventName}` : "";
  modalDate.textContent = message.createdAt
    ? new Date(message.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  modalMessage.textContent = message.message || "";
  modal.classList.remove("hidden");
}

function isNewMessage(message, lastVisit) {
  if (!message.createdAt) return false;
  if (!lastVisit) return true;
  return new Date(message.createdAt).getTime() > lastVisit;
}

function renderMessages(messages) {
  grid.innerHTML = "";

  if (!messages.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY));

  messages.forEach((message) => {
    const card = document.createElement("article");
    card.className = "envelope-card";

    const envelope = document.createElement("div");
    envelope.className = "envelope-illustration";

    const title = document.createElement("h3");
    title.className = "envelope-title";
    title.textContent = message.title || "Untitled";

    if (isNewMessage(message, lastVisit)) {
      const badge = document.createElement("span");
      badge.className = "new-badge";
      badge.textContent = "NEW";
      card.appendChild(badge);
    }

    card.appendChild(envelope);
    card.appendChild(title);

    card.addEventListener("click", () => openModal(message));

    grid.appendChild(card);
  });

  localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
}

async function loadMessages() {
  try {
    const res = await fetch("data/messages.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load messages.");
    const messages = await res.json();
    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderMessages(messages);
  } catch (err) {
    console.error(err);
    emptyState.classList.remove("hidden");
  }
}

loadMessages();
