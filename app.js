const STORAGE_KEY = "bookmarker-reviews-v1";

let books = loadBooks();
let currentFilter = "all";
let currentRating = 0;
let currentColor = "#bd604c";

const els = {
  bookGrid: document.querySelector("#bookGrid"),
  emptyState: document.querySelector("#emptyState"),
  count: document.querySelector("#bookCountText"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  dialog: document.querySelector("#bookDialog"),
  form: document.querySelector("#bookForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  deleteBook: document.querySelector("#deleteBook"),
  id: document.querySelector("#bookId"),
  title: document.querySelector("#titleInput"),
  author: document.querySelector("#authorInput"),
  status: document.querySelector("#statusInput"),
  rating: document.querySelector("#ratingInput"),
  review: document.querySelector("#reviewInput"),
  quote: document.querySelector("#quoteInput"),
  color: document.querySelector("#colorInput"),
  toast: document.querySelector("#toast"),
  library: document.querySelector("#librarySection"),
  insights: document.querySelector("#insightsSection"),
  statGrid: document.querySelector("#statGrid"),
  distribution: document.querySelector("#ratingDistribution"),
  mood: document.querySelector("#moodCopy")
};

function loadBooks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed.filter(book => !String(book.id).startsWith("sample-"));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function escapeHTML(value = "") {
  return value.replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function statusName(status) {
  return ({ reading: "읽는 중", finished: "다 읽음", wishlist: "읽고 싶음" })[status] || "기록";
}

function starMarkup(rating) {
  return Array.from({ length: 5 }, (_, index) =>
    `<span class="${index < rating ? "" : "empty"}">★</span>`
  ).join("");
}

function getVisibleBooks() {
  const query = els.search.value.trim().toLocaleLowerCase("ko");
  const filtered = books.filter(book => {
    const matchesFilter = currentFilter === "all" || book.status === currentFilter;
    const matchesQuery = !query || `${book.title} ${book.author}`.toLocaleLowerCase("ko").includes(query);
    return matchesFilter && matchesQuery;
  });

  return filtered.sort((a, b) => {
    if (els.sort.value === "rating") return b.rating - a.rating;
    if (els.sort.value === "title") return a.title.localeCompare(b.title, "ko");
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function renderBooks() {
  const visibleBooks = getVisibleBooks();
  els.bookGrid.innerHTML = visibleBooks.map(book => `
    <article class="book-card" data-id="${book.id}" tabindex="0" aria-label="${escapeHTML(book.title)} 기록 열기">
      <div class="book-cover" style="--cover:${book.color}">
        <span class="cover-title">${escapeHTML(book.title)}</span>
        <span class="cover-author">${escapeHTML(book.author)}</span>
      </div>
      <div class="book-info">
        <span class="status-label">${statusName(book.status)}</span>
        <h3>${escapeHTML(book.title)}</h3>
        <p class="author">${escapeHTML(book.author)}</p>
        <div class="stars" aria-label="별점 ${book.rating}점">${starMarkup(book.rating)}</div>
        <p class="review-preview">${escapeHTML(book.review || book.quote || "아직 감상을 남기지 않았어요.")}</p>
      </div>
    </article>
  `).join("");

  els.emptyState.hidden = visibleBooks.length > 0;
  els.bookGrid.hidden = visibleBooks.length === 0;
  const finished = books.filter(book => book.status === "finished").length;
  els.count.textContent = `총 ${books.length}권 · ${finished}권을 끝까지 읽었어요.`;
}

function openDialog(book = null) {
  els.form.reset();
  els.id.value = book?.id || "";
  els.title.value = book?.title || "";
  els.author.value = book?.author || "";
  els.status.value = book?.status || "reading";
  els.review.value = book?.review || "";
  els.quote.value = book?.quote || "";
  setRating(book?.rating || 0);
  setColor(book?.color || "#bd604c");
  els.dialogTitle.textContent = book ? "독서 기록 수정" : "새 독서 기록";
  els.deleteBook.hidden = !book;
  els.dialog.showModal();
  requestAnimationFrame(() => els.title.focus());
}

function closeDialog() {
  els.dialog.close();
}

function setRating(rating) {
  currentRating = Number(rating);
  els.rating.value = currentRating;
  document.querySelectorAll("#starPicker button").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.rating) <= currentRating);
  });
}

function setColor(color) {
  currentColor = color;
  els.color.value = color;
  document.querySelectorAll("#colorPicker button").forEach(button => {
    button.classList.toggle("selected", button.dataset.color === color);
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function renderStats() {
  const finished = books.filter(book => book.status === "finished").length;
  const reading = books.filter(book => book.status === "reading").length;
  const rated = books.filter(book => book.rating > 0);
  const average = rated.length ? (rated.reduce((sum, book) => sum + book.rating, 0) / rated.length).toFixed(1) : "–";
  const quotes = books.filter(book => book.quote.trim()).length;

  els.statGrid.innerHTML = [
    ["서재에 담은 책", books.length, "권"],
    ["완독한 책", finished, "권"],
    ["지금 읽는 책", reading, "권"],
    ["평균 별점", average, average === "–" ? "" : "점"]
  ].map(([label, value, unit]) => `
    <div class="stat-card"><span>${label}</span><strong>${value}</strong><small>${unit}</small></div>
  `).join("");

  const distribution = [5, 4, 3, 2, 1].map(score => {
    const count = books.filter(book => book.rating === score).length;
    const percent = rated.length ? Math.round(count / rated.length * 100) : 0;
    return `<div class="rating-row"><span>${score}점</span><div class="rating-bar"><i style="width:${percent}%"></i></div><b>${count}</b></div>`;
  }).join("");
  els.distribution.innerHTML = distribution;

  els.mood.textContent = quotes
    ? `${quotes}개의 문장을 붙잡아 두었어요. 별점보다 문장을 오래 기억하는 독서가네요.`
    : "첫 문장을 기록하면 나만의 독서 취향이 보이기 시작할 거예요.";
}

function switchSection(section) {
  const showInsights = section === "insights";
  els.library.hidden = showInsights;
  els.insights.hidden = !showInsights;
  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.section === section);
  });
  if (showInsights) renderStats();
  window.scrollTo({ top: document.querySelector("main").offsetTop, behavior: "smooth" });
}

document.querySelectorAll("#openAddModal, #heroAddButton, #emptyAddButton").forEach(button => {
  button.addEventListener("click", () => openDialog());
});

document.querySelectorAll(".filter-chip").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach(chip => {
      const active = chip === button;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-selected", active);
    });
    renderBooks();
  });
});

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => switchSection(button.dataset.section));
});

document.querySelectorAll("#starPicker button").forEach(button => {
  button.addEventListener("click", () => setRating(button.dataset.rating));
});

document.querySelectorAll("#colorPicker button").forEach(button => {
  button.addEventListener("click", () => setColor(button.dataset.color));
});

els.bookGrid.addEventListener("click", event => {
  const card = event.target.closest(".book-card");
  if (card) openDialog(books.find(book => book.id === card.dataset.id));
});

els.bookGrid.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const card = event.target.closest(".book-card");
    if (card) openDialog(books.find(book => book.id === card.dataset.id));
  }
});

els.form.addEventListener("submit", event => {
  event.preventDefault();
  if (!els.form.reportValidity()) return;

  const book = {
    id: els.id.value || `book-${Date.now()}`,
    title: els.title.value.trim(),
    author: els.author.value.trim(),
    status: els.status.value,
    rating: currentRating,
    review: els.review.value.trim(),
    quote: els.quote.value.trim(),
    color: currentColor,
    createdAt: els.id.value
      ? books.find(item => item.id === els.id.value)?.createdAt || new Date().toISOString()
      : new Date().toISOString()
  };

  const existingIndex = books.findIndex(item => item.id === book.id);
  if (existingIndex >= 0) books[existingIndex] = book;
  else books.unshift(book);

  saveBooks();
  renderBooks();
  closeDialog();
  showToast(existingIndex >= 0 ? "기록을 새롭게 다듬었어요." : "새 책을 서재에 꽂았어요.");
});

els.deleteBook.addEventListener("click", () => {
  const id = els.id.value;
  if (!id) return;
  books = books.filter(book => book.id !== id);
  saveBooks();
  renderBooks();
  closeDialog();
  showToast("기록을 서재에서 꺼냈어요.");
});

els.search.addEventListener("input", renderBooks);
els.sort.addEventListener("change", renderBooks);
document.querySelector("#closeDialog").addEventListener("click", closeDialog);
document.querySelector("#cancelDialog").addEventListener("click", closeDialog);

els.dialog.addEventListener("click", event => {
  if (event.target === els.dialog) closeDialog();
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("bookmarker-theme", document.body.classList.contains("dark") ? "dark" : "light");
});

if (localStorage.getItem("bookmarker-theme") === "dark") document.body.classList.add("dark");
document.querySelector("#year").textContent = new Date().getFullYear();
renderBooks();
