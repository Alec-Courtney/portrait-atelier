"use strict";
const series = [
  { id: "all", name: "全部" },
  { id: "playful", name: "俏皮日常" },
  { id: "sport", name: "运动日记" },
  { id: "solo", name: "单人写真" },
  { id: "duo", name: "双人写真" },
  { id: "sakura", name: "樱花日记" },
  { id: "blue", name: "蓝白物语" },
  { id: "school", name: "制服时光" },
  { id: "costume", name: "角色写真" },
  { id: "daily", name: "日常片刻" },
  { id: "together", name: "双人合照" }
];
const $ = (id) => document.getElementById(id);
const state = { photos: [], active: "all", order: "newest", visible: 24, viewerPhotos: [], current: 0, previousFocus: null };
const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" });
const photoNumber = (photo) => /^(solo|duo|playful|sport)-portrait-\d{2}$/.test(photo.id) ? photo.id.slice(-2) : photo.number;
const categoryName = (id) => series.find((s) => s.id === id)?.name || "人像作品";
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function filteredPhotos() {
  const photos = state.photos.filter((photo) => state.active === "all" || photo.category === state.active);
  photos.sort((a, b) => state.order === "oldest" ? a.created.localeCompare(b.created) : b.created.localeCompare(a.created));
  return photos;
}
function imageFor(photo, eager = false) {
  const img = element("img");
  img.src = photo.thumb;
  img.srcset = photo.thumb + " " + photo.thumbWidth + "w, " + photo.src + " " + photo.width + "w";
  img.sizes = eager ? "(max-width:700px) 47vw, 34vw" : "(max-width:700px) 47vw, (max-width:1100px) 31vw, 23vw";
  img.width = photo.width;
  img.height = photo.height;
  img.alt = photo.title;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (eager) img.fetchPriority = "high";
  img.addEventListener("error", () => img.parentElement.classList.add("image-failed"));
  return img;
}
function openAt(photo, photos) {
  state.viewerPhotos = photos;
  state.current = Math.max(0, photos.findIndex((item) => item.id === photo.id));
  state.previousFocus = document.activeElement;
  renderViewer();
  $("lightbox").showModal();
  document.body.style.overflow = "hidden";
  $("close-viewer").focus();
}
function renderFeatured() {
  const target = $("featured");
  target.replaceChildren();
  const chosen = state.photos.filter((photo) => photo.featured).sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0)).slice(0, 3);
  target.classList.toggle("portrait-set", chosen.length > 0 && chosen.every((photo) => ["solo", "duo", "playful", "sport"].includes(photo.category)));
  chosen.forEach((photo, index) => {
    const button = element("button", "featured-card");
    button.type = "button";
    button.setAttribute("aria-label", "查看精选作品：" + photo.title);
    const frame = element("div", "featured-image");
    frame.append(imageFor(photo, true), element("span", "image-open", "查看作品"));
    const caption = element("div", "featured-caption");
    caption.append(element("strong", "", photo.outfit || categoryName(photo.category)), element("span", "", categoryName(photo.category) + " / " + photoNumber(photo)));
    button.append(frame, caption);
    button.addEventListener("click", () => openAt(photo, state.photos.filter((p) => p.category === photo.category)));
    target.append(button);
  });
  $("archive-count").textContent = String(state.photos.length).padStart(3, "0") + " 件作品 / " + new Set(state.photos.map((photo) => photo.category)).size + " 个系列";
}
function renderFilters() {
  $("filters").replaceChildren();
  series.forEach((category) => {
    const count = state.photos.filter((p) => category.id === "all" || p.category === category.id).length;
    if (!count) return;
    const button = element("button", "filter", category.name);
    button.type = "button";
    button.dataset.category = category.id;
    button.setAttribute("aria-pressed", String(state.active === category.id));
    button.append(element("span", "filter-count", String(count).padStart(2, "0")));
    button.addEventListener("click", () => {
      state.active = category.id;
      state.visible = 24;
      $("filters").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      renderGallery();
    });
    $("filters").append(button);
  });
}
function renderGallery(append = false) {
  const allMatching = filteredPhotos();
  const featuredIds = new Set(state.photos.filter((p) => p.featured).map((p) => p.id));
  const photos = state.active === "all" ? allMatching.filter((p) => !featuredIds.has(p.id)) : allMatching;
  $("featured").hidden = state.active !== "all";
  const grid = $("gallery-grid");
  const start = append ? grid.children.length : 0;
  if (!append) grid.replaceChildren();
  const fragment = document.createDocumentFragment();
  photos.slice(start, state.visible).forEach((photo) => {
    const card = element("article", "photo-card");
    const button = element("button", "photo-button");
    button.type = "button";
    button.setAttribute("aria-label", "查看作品：" + photo.title);
    const frame = element("div", "photo-image");
    frame.style.aspectRatio = photo.originalWidth + " / " + photo.originalHeight;
    frame.append(imageFor(photo), element("span", "image-open", "查看作品"));
    const caption = element("div", "photo-caption");
    caption.append(element("h3", "photo-title", photo.title), element("span", "photo-number", photoNumber(photo)));
    button.append(frame, caption, element("div", "photo-subtitle", categoryName(photo.category) + " · " + dateFormatter.format(new Date(photo.created))));
    button.addEventListener("click", () => openAt(photo, allMatching));
    card.append(button);
    fragment.append(card);
  });
  grid.append(fragment);
  const remaining = Math.max(0, photos.length - state.visible);
  $("results-count").textContent = categoryName(state.active) + " / " + allMatching.length + " 件作品";
  $("load-more").hidden = !remaining;
  $("remaining").textContent = "还有 " + remaining + " 件";
  $("end-note").hidden = remaining > 0;
  if (append) grid.children[start]?.querySelector("button")?.focus({ preventScroll: true });
}
function renderViewer() {
  const photo = state.viewerPhotos[state.current];
  if (!photo) return;
  const image = $("viewer-image");
  $("image-error").hidden = true;
  image.hidden = false;
  image.alt = photo.title;
  image.src = photo.src;
  $("photo-title").textContent = photo.title;
  $("photo-category").textContent = categoryName(photo.category) + " / " + photoNumber(photo);
  $("photo-date").textContent = "创作于 " + dateFormatter.format(new Date(photo.created));
  $("photo-dimensions").textContent = photo.originalWidth + " × " + photo.originalHeight;
  $("viewer-counter").textContent = String(state.current + 1).padStart(2, "0") + " / " + String(state.viewerPhotos.length).padStart(2, "0");
  $("previous").hidden = state.viewerPhotos.length < 2;
  $("next").hidden = state.viewerPhotos.length < 2;
  const upcoming = state.viewerPhotos[(state.current + 1) % state.viewerPhotos.length];
  if (upcoming && upcoming.id !== photo.id) { const preload = new Image(); preload.src = upcoming.src; }
}
function moveViewer(delta) {
  state.current = (state.current + delta + state.viewerPhotos.length) % state.viewerPhotos.length;
  renderViewer();
}
$("load-more").addEventListener("click", () => { state.visible += 24; renderGallery(true); });
$("sort").addEventListener("change", (event) => { state.order = event.target.value; state.visible = 24; renderGallery(); });
$("series-link").addEventListener("click", () => { $("gallery").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); $("filters").querySelector("button")?.focus({ preventScroll: true }); });
$("close-viewer").addEventListener("click", () => $("lightbox").close());
$("lightbox").addEventListener("close", () => { document.body.style.overflow = ""; $("viewer-image").removeAttribute("src"); state.previousFocus?.focus({ preventScroll: true }); });
$("previous").addEventListener("click", () => moveViewer(-1));
$("next").addEventListener("click", () => moveViewer(1));
$("viewer-image").addEventListener("error", () => { if (!$("lightbox").open) return; $("viewer-image").hidden = true; $("image-error").hidden = false; });
$("lightbox").addEventListener("keydown", (event) => { if (event.key === "ArrowLeft") { event.preventDefault(); moveViewer(-1); } if (event.key === "ArrowRight") { event.preventDefault(); moveViewer(1); } });
let touchStart = null;
$("viewer-stage").addEventListener("touchstart", (event) => { if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }, { passive: true });
$("viewer-stage").addEventListener("touchend", (event) => { if (!touchStart || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - touchStart.x; const dy = event.changedTouches[0].clientY - touchStart.y; if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) moveViewer(dx < 0 ? 1 : -1); touchStart = null; }, { passive: true });
async function initialize() {
  try {
    $("error-state").hidden = true;
    const response = await fetch("photos.json");
    if (!response.ok) throw new Error("Photo collection is unavailable");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Photo collection is empty");
    state.photos = data;
    renderFeatured(); renderFilters(); renderGallery();
  } catch (error) { $("error-state").hidden = false; $("load-more").hidden = true; $("end-note").hidden = true; }
}
$("retry").addEventListener("click", initialize);
initialize();
