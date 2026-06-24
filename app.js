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
        <button class="share-book" data-share-id="${book.id}" aria-label="${escapeHTML(book.title)} 이미지 공유" title="이미지 공유">
          <span aria-hidden="true">↗</span>
        </button>
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

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 6) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];

  paragraphs.forEach(paragraph => {
    let line = "";
    for (const char of paragraph) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line.trim());
        line = char;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line.trim());
  });

  const visibleLines = lines.slice(0, maxLines);
  visibleLines.forEach((line, index) => {
    const needsEllipsis = index === maxLines - 1 && lines.length > maxLines;
    ctx.fillText(needsEllipsis ? `${line.replace(/[.。…]+$/, "")}…` : line, x, y + index * lineHeight);
  });

  return y + visibleLines.length * lineHeight;
}

async function shareReviewImage(book) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#111b42");
  background.addColorStop(0.46, "#071326");
  background.addColorStop(1, "#050914");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  const seed = [...book.title].reduce((sum, char) => sum + char.charCodeAt(0), 17);
  for (let index = 0; index < 150; index += 1) {
    const x = (seed * (index + 19) * 47) % 1080;
    const y = (seed * (index + 31) * 73) % 1350;
    const radius = index % 13 === 0 ? 2.3 : index % 5 === 0 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = index % 7 === 0 ? "rgba(255,229,169,.78)" : "rgba(225,235,255,.7)";
    ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = "rgba(255,236,197,.48)";
  ctx.shadowBlur = 55;
  ctx.fillStyle = "#f4e7c8";
  ctx.beginPath();
  ctx.arc(876, 150, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#efbd58";
  ctx.font = '800 27px "Apple SD Gothic Neo", sans-serif';
  ctx.letterSpacing = "4px";
  ctx.fillText("책갈피 · READING NOTE", 82, 108);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#f8f3e8";
  ctx.font = '700 76px Georgia, "Noto Serif KR", serif';
  const titleBottom = drawWrappedText(ctx, book.title, 82, 230, 820, 92, 3);

  ctx.fillStyle = "#acb8ca";
  ctx.font = '500 31px "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(book.author, 86, titleBottom + 22);

  const cardY = Math.max(485, titleBottom + 78);
  const cardHeight = 1350 - cardY - 92;
  roundRectPath(ctx, 64, cardY, 952, cardHeight, 32);
  ctx.fillStyle = "rgba(16, 31, 54, .88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(221, 232, 250, .2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = book.color || "#bd604c";
  roundRectPath(ctx, 100, cardY + 46, 14, 112, 7);
  ctx.fill();

  ctx.fillStyle = "#ee846f";
  ctx.font = '800 24px "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(statusName(book.status), 144, cardY + 82);

  ctx.fillStyle = "#efbd58";
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText("★".repeat(book.rating) + "☆".repeat(5 - book.rating), 144, cardY + 137);

  ctx.strokeStyle = "rgba(221, 232, 250, .15)";
  ctx.beginPath();
  ctx.moveTo(100, cardY + 194);
  ctx.lineTo(980, cardY + 194);
  ctx.stroke();

  ctx.fillStyle = "#f7f2e8";
  ctx.font = '500 40px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const review = book.review || "이 책에 대한 나의 기록을 남겼어요.";
  const reviewBottom = drawWrappedText(ctx, review, 106, cardY + 265, 852, 60, 6);

  if (book.quote) {
    const quoteY = Math.min(reviewBottom + 62, cardY + cardHeight - 180);
    ctx.fillStyle = "#efbd58";
    ctx.font = '700 55px Georgia, serif';
    ctx.fillText("“", 100, quoteY);
    ctx.fillStyle = "#c5cede";
    ctx.font = 'italic 31px Georgia, "Noto Serif KR", serif';
    drawWrappedText(ctx, book.quote, 154, quoteY - 7, 790, 48, 3);
  }

  ctx.fillStyle = "rgba(215,225,241,.55)";
  ctx.font = '500 22px "Apple SD Gothic Neo", sans-serif';
  ctx.fillText("oddpennine.github.io/book-review-site", 100, cardY + cardHeight - 48);

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
    if (!blob) throw new Error("이미지를 만들지 못했어요.");

    const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60) || "독서기록";
    const file = new File([blob], `${safeTitle}-책갈피.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${book.title} · 책갈피`,
        text: `${book.title} — ${book.author}`
      });
      showToast("공유 메뉴를 열었어요.");
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("공유 이미지를 PNG로 저장했어요.");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("이미지를 만드는 중 문제가 생겼어요.");
  }
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
  const shareButton = event.target.closest(".share-book");
  if (shareButton) {
    event.stopPropagation();
    const book = books.find(item => item.id === shareButton.dataset.shareId);
    if (book) shareReviewImage(book);
    return;
  }

  const card = event.target.closest(".book-card");
  if (card) openDialog(books.find(book => book.id === card.dataset.id));
});

els.bookGrid.addEventListener("keydown", event => {
  if (event.target.closest(".share-book")) return;
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
