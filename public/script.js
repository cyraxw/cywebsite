const grid = document.getElementById("calloutsGrid");

async function loadCallouts() {
  const response = await fetch("/api/callouts");
  const callouts = await response.json();

  grid.innerHTML = callouts.map(callout => 
    <article
      class="callout-card"
      data-image="${callout.image}"
      data-title="${callout.title}"
      data-description="${callout.description || ""}"
    >
      <img src="${callout.image}" alt="${callout.title}">

      <div class="callout-content">
        <h3>${callout.title}</h3>
        <p>${callout.description || ""}</p>
      </div>
    </article>
  ).join("");
}

grid.addEventListener("click", event => {
  const card = event.target.closest(".callout-card");

  if (!card) return;

  document.getElementById("modalImage").src =
    card.dataset.image;

  document.getElementById("modalTitle").textContent =
    card.dataset.title;

  document.getElementById("modalDescription").textContent =
    card.dataset.description;

  document
    .getElementById("attachmentModal")
    .classList.add("active");
});

document.getElementById("closeAttachment").onclick = closeViewer;

document.getElementById("attachmentModal").addEventListener("click", event => {
  if (event.target.id === "attachmentModal") {
    closeViewer();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeViewer();
  }
});

function closeViewer() {
  document
    .getElementById("attachmentModal")
    .classList.remove("active");
}

loadCallouts();