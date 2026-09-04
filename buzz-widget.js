(function () {
  "use strict";

  var root = document.getElementById("mjr-buzz-feed");
  if (!root || root.getAttribute("data-mjr-loaded") === "true") return;
  root.setAttribute("data-mjr-loaded", "true");
  addStyles();

  var category = (root.getAttribute("data-category") || "television").toLowerCase();
  var categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  var feedUrl = "https://raw.githubusercontent.com/Mediajobsreport/mjr-cision-newswire/main/data/newswire/" + encodeURIComponent(category) + ".json";
  var releases = [];
  var generatedAt = null;
  var pageSize = 10;
  var currentPage = 1;

  fetch(feedUrl, { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Feed returned " + response.status);
      return response.json();
    })
    .then(function (data) {
      releases = Array.isArray(data.releases) ? data.releases : [];
      generatedAt = data.generated_at || null;
      route();
    })
    .catch(function (error) {
      console.error("MJR Buzz feed error:", error);
      root.innerHTML = '<div class="mjr-buzz-error">The latest ' + escapeHtml(categoryLabel) + ' news could not be loaded. Please try again shortly.</div>';
    });

  window.addEventListener("popstate", route);

  function route() {
    var releaseId = new URLSearchParams(window.location.search).get("release");
    if (releaseId) {
      var release = releases.find(function (item) { return String(item.release_id) === releaseId; });
      if (release) return renderArticle(release);
    }
    renderList();
  }

  function renderList() {
    if (!releases.length) {
      root.innerHTML = '<div class="mjr-buzz-empty">There are no current ' + escapeHtml(categoryLabel) + ' releases. Please check back soon.</div>' + updatedMarkup();
      return;
    }

    var totalPages = Math.max(1, Math.ceil(releases.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    var start = (currentPage - 1) * pageSize;
    var items = releases.slice(start, start + pageSize);
    root.innerHTML = '<div class="mjr-buzz-list">' + items.map(cardMarkup).join("") + '</div>' + paginationMarkup(totalPages) + updatedMarkup();

    root.querySelectorAll("[data-release-id]").forEach(function (button) {
      button.addEventListener("click", function () { openArticle(button.getAttribute("data-release-id")); });
    });
    root.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        currentPage = Number(button.getAttribute("data-page"));
        renderList();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function cardMarkup(release) {
    var image = firstPhoto(release);
    var source = sourceName(release);
    var summary = excerpt(release.summary || release.body || "", 260);
    return '<article class="mjr-buzz-card' + (image ? '' : ' mjr-buzz-card--no-image') + '">' +
      (image ? '<div class="mjr-buzz-image-wrap"><img class="mjr-buzz-image" src="' + escapeAttr(image.thumbnailurl || image.url) + '" alt="' + escapeAttr(image.caption || release.title || "") + '" loading="lazy"></div>' : '') +
      '<div class="mjr-buzz-card-body">' +
        '<div class="mjr-buzz-meta">' + escapeHtml(formatDate(release.date)) + (source ? ' · ' + escapeHtml(source) : '') + '</div>' +
        '<h2 class="mjr-buzz-title"><button class="mjr-buzz-title-button" type="button" data-release-id="' + escapeAttr(release.release_id) + '">' + escapeHtml(decodeEntities(release.title || "Untitled release")) + '</button></h2>' +
        (summary ? '<p class="mjr-buzz-summary">' + escapeHtml(summary) + '</p>' : '') +
        '<button class="mjr-buzz-read" type="button" data-release-id="' + escapeAttr(release.release_id) + '">Read Full Release</button>' +
      '</div></article>';
  }

  function renderArticle(release) {
    var image = firstPhoto(release);
    var source = sourceName(release);
    root.innerHTML = '<button class="mjr-buzz-back" type="button">← Back to ' + escapeHtml(categoryLabel) + ' news</button>' +
      '<article class="mjr-buzz-article">' +
        '<div class="mjr-buzz-meta">' + escapeHtml(formatDate(release.date)) + (source ? ' · ' + escapeHtml(source) : '') + '</div>' +
        '<h1>' + escapeHtml(decodeEntities(release.title || "Untitled release")) + '</h1>' +
        (image ? '<img class="mjr-buzz-article-image" src="' + escapeAttr(image.url || image.thumbnailurl) + '" alt="' + escapeAttr(image.caption || release.title || "") + '">' : '') +
        (image && image.caption ? '<p class="mjr-buzz-caption">' + escapeHtml(decodeEntities(image.caption)) + '</p>' : '') +
        '<div class="mjr-buzz-content">' + sanitizeHtml(release.body || release.summary || "") + '</div>' +
        '<div class="mjr-buzz-source">Original release supplied by ' + escapeHtml(source || "the issuing organization") + ' through PR Newswire.</div>' +
      '</article>';
    root.querySelector(".mjr-buzz-back").addEventListener("click", closeArticle);
    document.title = decodeEntities(release.title || categoryLabel + " News");
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openArticle(id) {
    var url = new URL(window.location.href);
    url.searchParams.set("release", id);
    history.pushState({ release: id }, "", url.toString());
    route();
  }

  function closeArticle() {
    var url = new URL(window.location.href);
    url.searchParams.delete("release");
    history.pushState({}, "", url.toString());
    document.title = categoryLabel + " News | Media Jobs Report";
    renderList();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function paginationMarkup(totalPages) {
    if (totalPages <= 1) return "";
    var html = '<nav class="mjr-buzz-pagination" aria-label="News pages">';
    for (var i = 1; i <= totalPages; i += 1) {
      html += '<button type="button" class="mjr-buzz-page" data-page="' + i + '"' + (i === currentPage ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    return html + '</nav>';
  }

  function updatedMarkup() {
    return generatedAt ? '<div class="mjr-buzz-updated">Feed updated ' + escapeHtml(new Date(generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })) + '</div>' : "";
  }

  function firstPhoto(release) {
    var media = Array.isArray(release.multimedia) ? release.multimedia : [];
    return media.find(function (item) { return item && item.type === "photo" && (item.url || item.thumbnailurl); }) || null;
  }

  function sourceName(release) {
    if (release.source_company) return decodeEntities(release.source_company);
    if (Array.isArray(release.company) && release.company[0]) return decodeEntities(release.company[0]);
    return "";
  }

  function excerpt(html, limit) {
    var doc = new DOMParser().parseFromString(String(html), "text/html");
    var text = decodeEntities((doc.body.textContent || "").replace(/\s+/g, " ").trim());
    if (text.length <= limit) return text;
    return text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
  }

  function formatDate(value) {
    var match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})T/);
    var date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  }

  function sanitizeHtml(html) {
    var allowedTags = new Set(["A", "B", "BLOCKQUOTE", "BR", "EM", "FIGCAPTION", "FIGURE", "H2", "H3", "H4", "I", "IMG", "LI", "OL", "P", "STRONG", "SUB", "SUP", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "U", "UL"]);
    var removeTags = new Set(["BUTTON", "EMBED", "FORM", "IFRAME", "INPUT", "MATH", "NOSCRIPT", "OBJECT", "SCRIPT", "STYLE", "SVG", "TEMPLATE"]);
    var doc = new DOMParser().parseFromString(String(html), "text/html");
    Array.from(doc.body.querySelectorAll("*")).forEach(function (node) {
      if (removeTags.has(node.tagName)) { node.remove(); return; }
      if (!allowedTags.has(node.tagName)) {
        node.replaceWith.apply(node, Array.from(node.childNodes));
        return;
      }
      var href = node.tagName === "A" ? node.getAttribute("href") : "";
      var src = node.tagName === "IMG" ? node.getAttribute("src") : "";
      var alt = node.tagName === "IMG" ? node.getAttribute("alt") : "";
      Array.from(node.attributes).forEach(function (attribute) { node.removeAttribute(attribute.name); });
      if (node.tagName === "A" && /^https?:\/\//i.test(href || "")) {
        node.setAttribute("href", href);
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
      if (node.tagName === "IMG" && /^https:\/\//i.test(src || "")) {
        node.setAttribute("src", src);
        node.setAttribute("alt", alt || "");
        node.setAttribute("loading", "lazy");
      }
    });
    return doc.body.innerHTML;
  }

  function decodeEntities(value) {
    var textarea = document.createElement("textarea");
    textarea.innerHTML = String(value || "");
    return textarea.value;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
    });
  }

  function escapeAttr(value) { return escapeHtml(value); }

  function addStyles() {
    if (document.getElementById("mjr-buzz-styles")) return;
    var style = document.createElement("style");
    style.id = "mjr-buzz-styles";
    style.textContent = [
      '#mjr-buzz-feed{--mjr-blue:#192a56;--mjr-border:#dce2eb;--mjr-muted:#5d6675;color:#1d2433;font-family:Roboto,Arial,sans-serif;margin:0 auto;max-width:1100px}',
      '#mjr-buzz-feed *,#mjr-buzz-feed *:before,#mjr-buzz-feed *:after{box-sizing:border-box}',
      '.mjr-buzz-status,.mjr-buzz-empty,.mjr-buzz-error{background:#f5f7fa;border:1px solid var(--mjr-border);padding:22px;text-align:center}.mjr-buzz-error{color:#9d1c1c}',
      '.mjr-buzz-list{display:grid;gap:18px}.mjr-buzz-card{align-items:stretch;background:#fff;border:1px solid var(--mjr-border);display:grid;grid-template-columns:minmax(180px,28%) 1fr;overflow:hidden}.mjr-buzz-card--no-image{grid-template-columns:1fr}',
      '.mjr-buzz-image-wrap{background:#eef1f5;min-height:190px}.mjr-buzz-image{display:block;height:100%;object-fit:cover;width:100%}.mjr-buzz-card-body{padding:22px 24px}',
      '.mjr-buzz-meta{color:var(--mjr-muted);font-size:13px;font-weight:600;letter-spacing:.02em;margin-bottom:8px;text-transform:uppercase}.mjr-buzz-title{color:var(--mjr-blue);font-size:clamp(21px,2.2vw,28px);line-height:1.18;margin:0 0 10px}',
      '.mjr-buzz-title-button{background:none;border:0;color:inherit;cursor:pointer;font:inherit;font-weight:700;padding:0;text-align:left}.mjr-buzz-title-button:hover,.mjr-buzz-title-button:focus{text-decoration:underline}',
      '.mjr-buzz-summary{color:#3f4857;font-size:16px;line-height:1.55;margin:0 0 14px}.mjr-buzz-read{background:var(--mjr-blue);border:1px solid var(--mjr-blue);color:#fff;cursor:pointer;display:inline-block;font-size:14px;font-weight:700;padding:9px 15px}.mjr-buzz-read:hover,.mjr-buzz-read:focus{background:#0f1b3c}',
      '.mjr-buzz-pagination{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px 0 10px}.mjr-buzz-page{background:#fff;border:1px solid var(--mjr-border);color:var(--mjr-blue);cursor:pointer;font-weight:700;min-width:40px;padding:8px 11px}.mjr-buzz-page[aria-current=page]{background:var(--mjr-blue);color:#fff}.mjr-buzz-updated{color:var(--mjr-muted);font-size:12px;margin-top:18px;text-align:center}',
      '.mjr-buzz-back{background:none;border:0;color:var(--mjr-blue);cursor:pointer;font-size:15px;font-weight:700;margin:0 0 18px;padding:0}.mjr-buzz-back:hover,.mjr-buzz-back:focus{text-decoration:underline}.mjr-buzz-article{background:#fff;border:1px solid var(--mjr-border);padding:clamp(22px,4vw,46px)}.mjr-buzz-article h1{color:var(--mjr-blue);font-size:clamp(29px,4vw,44px);line-height:1.12;margin:0 0 14px}',
      '.mjr-buzz-article-image{display:block;height:auto;margin:24px auto;max-height:560px;max-width:100%;object-fit:contain}.mjr-buzz-caption{color:var(--mjr-muted);font-size:12px;margin:-16px 0 24px;text-align:center}.mjr-buzz-content{font-size:17px;line-height:1.7;overflow-wrap:anywhere}.mjr-buzz-content img{height:auto;max-width:100%}.mjr-buzz-content table{border-collapse:collapse;display:block;max-width:100%;overflow-x:auto}.mjr-buzz-content td,.mjr-buzz-content th{border:1px solid var(--mjr-border);padding:8px}.mjr-buzz-content a{color:#174ea6}.mjr-buzz-source{border-top:1px solid var(--mjr-border);color:var(--mjr-muted);font-size:13px;margin-top:30px;padding-top:16px}',
      '@media(max-width:700px){.mjr-buzz-card{grid-template-columns:1fr}.mjr-buzz-image-wrap{max-height:260px}.mjr-buzz-card-body{padding:18px}}'
    ].join("");
    document.head.appendChild(style);
  }
}());
