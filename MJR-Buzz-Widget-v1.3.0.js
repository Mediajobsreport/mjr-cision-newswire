/* MJR Buzz Widget v1.3.0 — SEO/crawlability + natural image layout + Cision copyright */
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
  var baseTitle = document.title;
  var baseDescription = getMetaContent("meta[name=\"description\"]");
  var baseCanonical = getLinkHref('link[rel="canonical"]') || cleanCurrentUrl();
  var activeJsonLd = null;

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
      var release = releases.find(function (item) {
        return String(item.release_id) === releaseId;
      });
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

    root.innerHTML =
      '<div class="mjr-buzz-list">' +
      items.map(cardMarkup).join("") +
      '</div>' +
      paginationMarkup(totalPages) +
      updatedMarkup();

    root.querySelectorAll("a[data-release-id]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        openArticle(link.getAttribute("data-release-id"));
      });
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
    var logo = image && isLogoImage(image);
    var source = sourceName(release);
    var summary = excerpt(release.summary || release.body || "", 260);
    var releaseUrl = releaseHref(release.release_id);

    return '<article class="mjr-buzz-card' + (image ? '' : ' mjr-buzz-card--no-image') + '">' +
      (image
        ? '<div class="mjr-buzz-image-wrap' + (logo ? ' mjr-buzz-image-wrap--logo' : '') + '">' +
            '<img class="mjr-buzz-image" src="' +
            escapeAttr(image.url || image.thumbnailurl) +
            '" alt="' +
            escapeAttr(image.caption || release.title || "") +
            '" loading="lazy">' +
          '</div>'
        : '') +
      '<div class="mjr-buzz-card-body">' +
        '<div class="mjr-buzz-meta">' +
          escapeHtml(formatDate(release.date)) +
          (source ? ' · ' + escapeHtml(source) : '') +
        '</div>' +
        '<h2 class="mjr-buzz-title">' +
          '<a class="mjr-buzz-title-link" data-release-id="' +
          escapeAttr(release.release_id) +
          '" href="' +
          escapeAttr(releaseUrl) +
          '">' +
          escapeHtml(decodeEntities(release.title || "Untitled release")) +
          '</a>' +
        '</h2>' +
        (summary ? '<p class="mjr-buzz-summary">' + escapeHtml(summary) + '</p>' : '') +
        '<a class="mjr-buzz-read" data-release-id="' +
        escapeAttr(release.release_id) +
        '" href="' +
        escapeAttr(releaseUrl) +
        '">Read Full Release</a>' +
      '</div>' +
    '</article>';
  }

  function renderArticle(release) {
    var image = firstPhoto(release);
    var source = sourceName(release);
    var copyrightYear = new Date().getFullYear();

    updateArticleSeo(release, image, source);

    root.innerHTML =
      '<button class="mjr-buzz-back" type="button">← Back to ' +
      escapeHtml(categoryLabel) +
      ' news</button>' +
      '<article class="mjr-buzz-article">' +
        '<div class="mjr-buzz-meta">' +
          escapeHtml(formatDate(release.date)) +
          (source ? ' · ' + escapeHtml(source) : '') +
        '</div>' +
        '<h1>' +
          escapeHtml(decodeEntities(release.title || "Untitled release")) +
        '</h1>' +
        (image
          ? '<img class="mjr-buzz-article-image" src="' +
            escapeAttr(image.url || image.thumbnailurl) +
            '" alt="' +
            escapeAttr(image.caption || release.title || "") +
            '">'
          : '') +
        (image && image.caption
          ? '<p class="mjr-buzz-caption">' +
            escapeHtml(decodeEntities(image.caption)) +
            '</p>'
          : '') +
        '<div class="mjr-buzz-content">' +
          sanitizeHtml(release.body || release.summary || "") +
        '</div>' +

        '<div class="mjr-buzz-cision-copyright">' +
          'Copyright ' +
          copyrightYear +
          ' Cision US Inc. All Rights Reserved.' +
        '</div>' +

        '<div class="mjr-buzz-source">' +
          'Original release supplied by ' +
          escapeHtml(source || "the issuing organization") +
          ' through PR Newswire.' +
        '</div>' +
      '</article>';

    root.querySelector(".mjr-buzz-back").addEventListener("click", closeArticle);
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
    restoreListSeo();
    renderList();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function releaseHref(id) {
    var url = new URL(window.location.href);
    url.searchParams.set("release", id);
    return url.pathname + url.search + url.hash;
  }

  function cleanCurrentUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete("release");
    return url.origin + url.pathname + url.search;
  }

  function absoluteReleaseUrl(id) {
    return new URL(releaseHref(id), window.location.origin).toString();
  }

  function updateArticleSeo(release, image, source) {
    var title = decodeEntities(release.title || categoryLabel + " News");
    var description = excerpt(release.summary || release.body || "", 160);
    var canonical = absoluteReleaseUrl(release.release_id);
    var imageUrl = image ? (image.url || image.thumbnailurl || "") : "";

    document.title = title + " | Media Jobs Report";

    setMetaContent('meta[name="description"]', description);
    setLinkHref('link[rel="canonical"]', canonical);

    setMetaContent('meta[property="og:type"]', "article", "property");
    setMetaContent('meta[property="og:title"]', title, "property");
    setMetaContent('meta[property="og:description"]', description, "property");
    setMetaContent('meta[property="og:url"]', canonical, "property");

    if (imageUrl) {
      setMetaContent('meta[property="og:image"]', imageUrl, "property");
    } else {
      removeManagedMeta('meta[property="og:image"]');
    }

    setMetaContent('meta[name="twitter:card"]', imageUrl ? "summary_large_image" : "summary");
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);

    if (imageUrl) {
      setMetaContent('meta[name="twitter:image"]', imageUrl);
    } else {
      removeManagedMeta('meta[name="twitter:image"]');
    }

    setArticleJsonLd(release, title, description, canonical, imageUrl, source);
  }

  function restoreListSeo() {
    document.title = baseTitle || (categoryLabel + " News | Media Jobs Report");

    if (baseDescription) {
      setMetaContent('meta[name="description"]', baseDescription);
    } else {
      removeManagedMeta('meta[name="description"]');
    }

    setLinkHref('link[rel="canonical"]', baseCanonical || cleanCurrentUrl());

    removeManagedMeta('meta[property="og:type"]');
    removeManagedMeta('meta[property="og:title"]');
    removeManagedMeta('meta[property="og:description"]');
    removeManagedMeta('meta[property="og:url"]');
    removeManagedMeta('meta[property="og:image"]');
    removeManagedMeta('meta[name="twitter:card"]');
    removeManagedMeta('meta[name="twitter:title"]');
    removeManagedMeta('meta[name="twitter:description"]');
    removeManagedMeta('meta[name="twitter:image"]');

    removeArticleJsonLd();
  }

  function getMetaContent(selector) {
    var node = document.head.querySelector(selector);
    return node ? (node.getAttribute("content") || "") : "";
  }

  function getLinkHref(selector) {
    var node = document.head.querySelector(selector);
    return node ? (node.getAttribute("href") || "") : "";
  }

  function setMetaContent(selector, content, attributeName) {
    var node = document.head.querySelector(selector);
    var selectorMatch;
    var attrName = attributeName || "name";

    if (!node) {
      node = document.createElement("meta");
      selectorMatch = selector.match(/\[(?:name|property)="([^"]+)"\]/);

      if (selectorMatch) {
        node.setAttribute(attrName, selectorMatch[1]);
      }

      node.setAttribute("data-mjr-buzz-managed", "true");
      document.head.appendChild(node);
    }

    node.setAttribute("content", content || "");
  }

  function setLinkHref(selector, href) {
    var node = document.head.querySelector(selector);

    if (!node) {
      node = document.createElement("link");
      node.setAttribute("rel", "canonical");
      node.setAttribute("data-mjr-buzz-managed", "true");
      document.head.appendChild(node);
    }

    node.setAttribute("href", href);
  }

  function removeManagedMeta(selector) {
    var node = document.head.querySelector(selector);

    if (node && node.getAttribute("data-mjr-buzz-managed") === "true") {
      node.remove();
    }
  }

  function setArticleJsonLd(release, title, description, canonical, imageUrl, source) {
    removeArticleJsonLd();

    var jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "url": canonical,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonical
      },
      "publisher": {
        "@type": "Organization",
        "name": "Media Jobs Report",
        "url": "https://www.mediajobsreport.com/"
      }
    };

    var published = schemaDate(release.date);
    if (published) jsonLd.datePublished = published;
    if (imageUrl) jsonLd.image = [imageUrl];

    if (source) {
      jsonLd.author = {
        "@type": "Organization",
        "name": source
      };
    }

    activeJsonLd = document.createElement("script");
    activeJsonLd.type = "application/ld+json";
    activeJsonLd.id = "mjr-buzz-article-jsonld";
    activeJsonLd.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(activeJsonLd);
  }

  function removeArticleJsonLd() {
    var node = document.getElementById("mjr-buzz-article-jsonld");
    if (node) node.remove();
    activeJsonLd = null;
  }

  function schemaDate(value) {
    var raw = String(value || "");
    var match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);

    if (match) {
      return match[1] + "-" + match[2] + "-" + match[3] +
        "T" + match[4] + ":" + match[5] + ":" + match[6] + "Z";
    }

    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function paginationMarkup(totalPages) {
    if (totalPages <= 1) return "";

    var html = '<nav class="mjr-buzz-pagination" aria-label="News pages">';

    for (var i = 1; i <= totalPages; i += 1) {
      html +=
        '<button type="button" class="mjr-buzz-page" data-page="' +
        i +
        '"' +
        (i === currentPage ? ' aria-current="page"' : '') +
        '>' +
        i +
        '</button>';
    }

    return html + '</nav>';
  }

  function updatedMarkup() {
    return generatedAt
      ? '<div class="mjr-buzz-updated">Feed updated ' +
        escapeHtml(
          new Date(generatedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          })
        ) +
        '</div>'
      : "";
  }

  function firstPhoto(release) {
    var media = Array.isArray(release.multimedia) ? release.multimedia : [];

    return media.find(function (item) {
      return item &&
        item.type === "photo" &&
        (item.url || item.thumbnailurl);
    }) || null;
  }

  function isLogoImage(image) {
    return /logo/i.test(
      String(image.caption || "") +
      " " +
      String(image.url || "") +
      " " +
      String(image.thumbnailurl || "")
    );
  }

  function sourceName(release) {
    if (release.source_company) {
      return decodeEntities(release.source_company);
    }

    if (Array.isArray(release.company) && release.company[0]) {
      return decodeEntities(release.company[0]);
    }

    return "";
  }

  function excerpt(html, limit) {
    var doc = new DOMParser().parseFromString(String(html), "text/html");

    var text = decodeEntities(
      (doc.body.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
    );

    if (text.length <= limit) return text;

    return text
      .slice(0, limit)
      .replace(/\s+\S*$/, "") + "…";
  }

  function formatDate(value) {
    var match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})T/);

    var date = match
      ? new Date(
          Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
          )
        )
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  function sanitizeHtml(html) {
    var allowedTags = new Set([
      "A",
      "B",
      "BLOCKQUOTE",
      "BR",
      "EM",
      "FIGCAPTION",
      "FIGURE",
      "H2",
      "H3",
      "H4",
      "I",
      "IMG",
      "LI",
      "OL",
      "P",
      "STRONG",
      "SUB",
      "SUP",
      "TABLE",
      "TBODY",
      "TD",
      "TH",
      "THEAD",
      "TR",
      "U",
      "UL"
    ]);

    var removeTags = new Set([
      "BUTTON",
      "EMBED",
      "FORM",
      "IFRAME",
      "INPUT",
      "MATH",
      "NOSCRIPT",
      "OBJECT",
      "SCRIPT",
      "STYLE",
      "SVG",
      "TEMPLATE"
    ]);

    var doc = new DOMParser().parseFromString(
      String(html),
      "text/html"
    );

    Array.from(doc.body.querySelectorAll("*")).forEach(function (node) {
      if (removeTags.has(node.tagName)) {
        node.remove();
        return;
      }

      if (!allowedTags.has(node.tagName)) {
        node.replaceWith.apply(
          node,
          Array.from(node.childNodes)
        );
        return;
      }

      var href =
        node.tagName === "A"
          ? node.getAttribute("href")
          : "";

      var src =
        node.tagName === "IMG"
          ? node.getAttribute("src")
          : "";

      var alt =
        node.tagName === "IMG"
          ? node.getAttribute("alt")
          : "";

      Array.from(node.attributes).forEach(function (attribute) {
        node.removeAttribute(attribute.name);
      });

      if (
        node.tagName === "A" &&
        /^https?:\/\//i.test(href || "")
      ) {
        node.setAttribute("href", href);
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }

      if (
        node.tagName === "IMG" &&
        /^https:\/\//i.test(src || "")
      ) {
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
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (character) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character];
      }
    );
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function addStyles() {
    if (document.getElementById("mjr-buzz-styles")) return;

    var style = document.createElement("style");
    style.id = "mjr-buzz-styles";

    style.textContent = [
      '#mjr-buzz-feed{--mjr-blue:#192a56;--mjr-border:#dce2eb;--mjr-muted:#5d6675;color:#1d2433;font-family:Roboto,Arial,sans-serif;margin:0 auto;max-width:1100px}',

      '#mjr-buzz-feed *,#mjr-buzz-feed *:before,#mjr-buzz-feed *:after{box-sizing:border-box}',

      '.mjr-buzz-status,.mjr-buzz-empty,.mjr-buzz-error{background:#f5f7fa;border:1px solid var(--mjr-border);padding:22px;text-align:center}.mjr-buzz-error{color:#9d1c1c}',

      '.mjr-buzz-list{display:grid;gap:18px}.mjr-buzz-card{align-items:start;background:#fff;border:1px solid var(--mjr-border);display:grid;grid-template-columns:minmax(210px,26%) 1fr;overflow:hidden}.mjr-buzz-card--no-image{grid-template-columns:1fr}',

      '.mjr-buzz-image-wrap{align-self:start;background:#fff;display:flex;justify-content:center;min-height:0;overflow:hidden}.mjr-buzz-image{display:block;height:auto!important;margin:0 auto;max-height:220px;max-width:100%;object-fit:contain;position:static;width:auto!important}.mjr-buzz-image-wrap--logo{padding:16px}.mjr-buzz-image-wrap--logo .mjr-buzz-image{max-height:188px}.mjr-buzz-card-body{padding:22px 24px}',

      '.mjr-buzz-meta{color:var(--mjr-muted);font-size:13px;font-weight:600;letter-spacing:.02em;margin-bottom:8px;text-transform:uppercase}.mjr-buzz-title{color:var(--mjr-blue);font-size:clamp(21px,2.2vw,28px);line-height:1.18;margin:0 0 10px}',

      '.mjr-buzz-title-link{color:inherit;font:inherit;font-weight:700;text-decoration:none}.mjr-buzz-title-link:hover,.mjr-buzz-title-link:focus{text-decoration:underline}',

      '.mjr-buzz-summary{color:#3f4857;font-size:16px;line-height:1.55;margin:0 0 14px}.mjr-buzz-read{background:var(--mjr-blue);border:1px solid var(--mjr-blue);color:#fff;cursor:pointer;display:inline-block;font-size:14px;font-weight:700;padding:9px 15px;text-decoration:none}.mjr-buzz-read:hover,.mjr-buzz-read:focus{background:#0f1b3c}',

      '.mjr-buzz-pagination{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px 0 10px}.mjr-buzz-page{background:#fff;border:1px solid var(--mjr-border);color:var(--mjr-blue);cursor:pointer;font-weight:700;min-width:40px;padding:8px 11px}.mjr-buzz-page[aria-current=page]{background:var(--mjr-blue);color:#fff}.mjr-buzz-updated{color:var(--mjr-muted);font-size:12px;margin-top:18px;text-align:center}',

      '.mjr-buzz-back{background:none;border:0;color:var(--mjr-blue);cursor:pointer;font-size:15px;font-weight:700;margin:0 0 18px;padding:0}.mjr-buzz-back:hover,.mjr-buzz-back:focus{text-decoration:underline}.mjr-buzz-article{background:#fff;border:1px solid var(--mjr-border);padding:clamp(22px,4vw,46px)}.mjr-buzz-article h1{color:var(--mjr-blue);font-size:clamp(29px,4vw,44px);line-height:1.12;margin:0 0 14px}',

      '.mjr-buzz-article-image{display:block;height:auto;margin:24px auto;max-height:560px;max-width:100%;object-fit:contain}.mjr-buzz-caption{color:var(--mjr-muted);font-size:12px;margin:-16px 0 24px;text-align:center}.mjr-buzz-content{font-size:17px;line-height:1.7;overflow-wrap:anywhere}.mjr-buzz-content img{height:auto;max-width:100%}.mjr-buzz-content table{border-collapse:collapse;display:block;max-width:100%;overflow-x:auto}.mjr-buzz-content td,.mjr-buzz-content th{border:1px solid var(--mjr-border);padding:8px}.mjr-buzz-content a{color:#174ea6}',

      '.mjr-buzz-cision-copyright{color:#1d2433;font-size:13px;line-height:1.5;margin-top:24px}',

      '.mjr-buzz-source{border-top:1px solid var(--mjr-border);color:var(--mjr-muted);font-size:13px;margin-top:16px;padding-top:16px}',

      '@media(max-width:700px){.mjr-buzz-card{grid-template-columns:1fr}.mjr-buzz-image-wrap{height:auto;min-height:0}.mjr-buzz-image{max-height:260px}.mjr-buzz-image-wrap--logo{padding:18px}.mjr-buzz-image-wrap--logo .mjr-buzz-image{max-height:220px}.mjr-buzz-card-body{padding:18px}}'
    ].join("");

    document.head.appendChild(style);
  }
}());
