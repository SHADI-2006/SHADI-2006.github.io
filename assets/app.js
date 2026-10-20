/* Portfolio page: renders everything from data/site.js (built by tools/build.py from your folders). */
(function () {
  "use strict";

  const { DATA, t, ui, esc, icon, isFilled } = PF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const profile = DATA.profile || {};
  const categories = DATA.categories || [];
  const projects = (DATA.projects || []).filter((p) => !p.hidden);
  const mediaOf = new Map(projects.map((p) => [p.id, PF.projectMedia(p)]));
  const docsOf = new Map(projects.map((p) => [p.id, PF.projectDocs(p)]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = { cat: "all", q: "", kind: "all", firstRender: true, modalId: null, modalIndex: 0 };
  const L = (ar, en) => (PF.lang === "ar" ? ar : en);

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const cvHref = () => profile.cvFile || `cv.html?lang=${PF.lang}`;
  const catById = (id) => categories.find((c) => c.id === id);
  const catLabel = (id) => { const c = catById(id); return c ? t(c) : id; };
  const catIcon = (id) => { const c = catById(id); return (c && c.icon) || "layers"; };
  const name = () => t(profile.name) || ui(PF.LOCAL ? "your_name" : "portfolio");
  const initials = () => name().trim().charAt(0).toUpperCase();
  const shortTitle = (p) => t(p.short) || t(p.title).split(/[—:]/)[0].trim();

  function hue(str) {
    let h = 0;
    for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }

  function socialLinks() {
    const out = [];
    const links = profile.links || {};
    const known = { github: "GitHub", linkedin: "LinkedIn", youtube: "YouTube", instagram: "Instagram", behance: "Behance", website: "Website" };
    Object.keys(known).forEach((k) => {
      if (isFilled(links[k])) out.push({ key: k === "website" ? "globe" : k, label: known[k], href: links[k] });
    });
    if (isFilled(profile.email)) out.push({ key: "mail", label: profile.email, href: "mailto:" + profile.email });
    return out;
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copy(text) {
    const done = () => toast(ui("copied"));
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }

  function mediaThumbHTML(m, alt, cls) {
    const dims = m.w && m.h ? ` width="${m.w}" height="${m.h}"` : "";
    if (m.kind === "report" && !m.thumb) return `<div class="${cls || ""} thumb-blank doc-blank">${icon("file")}<b>${esc(m.ext || "")}</b></div>`;
    if (m.thumb) return `<img class="${cls || ""}" src="${esc(m.thumb)}" alt="${esc(alt)}" loading="lazy" decoding="async"${dims} />`;
    if (m.type === "video") return `<video class="${cls || ""}" src="${esc(m.src)}#t=0.1" muted playsinline preload="metadata"></video>`;
    return `<div class="${cls || ""} thumb-blank">${icon("video")}</div>`;
  }

  function genCover(p) {
    const h = hue(p.id);
    const cat = (p.categories || [])[0];
    return `<div class="gen-cover" style="--h:${h}">
      <span class="gen-icon">${icon(catIcon(cat))}</span>
      <span class="gen-title">${esc(shortTitle(p))}</span>
    </div>`;
  }

  function mediaCounts(list) {
    const n = (k) => list.filter((m) => m.kind === k).length;
    return { photo: n("photo"), design: n("design"), video: n("video"), report: n("report") };
  }
  const projectAll = (p) => (mediaOf.get(p.id) || []).concat(docsOf.get(p.id) || []);

  /* ── nav ─────────────────────────────────────────────────────────────── */
  function renderNav() {
    $("#brand").innerHTML = `<span class="logo">${esc(initials())}</span><span class="brand-name">${esc(name())}</span>`;
    const items = [["work", "nav_work"], ["gallery", "nav_gallery"], ["skills", "nav_skills"], ["journey", "nav_journey"], ["contact", "nav_contact"]];
    $("#navLinks").innerHTML = items.map(([id, k]) => `<a href="#${id}" data-sec="${id}">${esc(ui(k))}</a>`).join("");
    const lb = $("#langBtn");
    lb.innerHTML = `${icon("globe")}<span>${PF.lang === "ar" ? "EN" : "ع"}</span>`;
    lb.setAttribute("aria-label", PF.lang === "ar" ? "Switch to English" : "التبديل للعربية");
    const theme = document.documentElement.getAttribute("data-theme");
    $("#themeBtn").innerHTML = icon(theme === "dark" ? "sun" : "moon");
    $("#themeBtn").setAttribute("aria-label", ui("theme"));
    const cv = $("#navCv");
    cv.href = cvHref();
    cv.innerHTML = `${icon("download")}<span>${esc(ui("cv"))}</span>`;
    $("#menuBtn").innerHTML = icon("menu");
    $("#menuBtn").setAttribute("aria-label", ui("menu"));
  }

  /* ── hero ────────────────────────────────────────────────────────────── */
  function renderHero() {
    const roles = t(profile.roles) || [];
    const picks = heroPicks();
    const socials = socialLinks();
    $("#heroText").innerHTML = `
      ${isFilled(t(profile.available)) ? `<span class="available"><span class="pulse"></span>${esc(t(profile.available))}</span>` : ""}
      ${profile.photo && picks.length ? `<img class="avatar" src="${esc(profile.photo)}" alt="${esc(name())}" />` : ""}
      <h1><span class="hello">${L("أهلاً، أنا", "Hi, I'm")}</span> <span class="grad">${esc(name())}</span></h1>
      <p class="role">${esc(t(profile.role))}</p>
      ${roles.length ? `<p class="rotator" aria-live="off"><span class="rot-dot"></span><span id="rot">${esc(roles[0])}</span></p>` : ""}
      <p class="bio">${esc(t(profile.bio))}</p>
      <div class="cta">
        <a class="btn btn-primary" href="#work">${esc(ui("view_work"))}${icon("arrow", "flip")}</a>
        <a class="btn btn-ghost" href="${esc(cvHref())}">${icon("download")}${esc(ui("download_cv"))}</a>
      </div>
      ${socials.length ? `<div class="socials">${socials.map((s) =>
        `<a href="${esc(s.href)}" ${s.key === "mail" ? "" : 'target="_blank" rel="noopener"'} aria-label="${esc(s.label)}" title="${esc(s.label)}">${icon(s.key)}</a>`).join("")}
        ${isFilled(t(profile.location)) ? `<span class="loc">${icon("pin")}${esc(t(profile.location))}</span>` : ""}</div>` : ""}`;

    // Visual: a fanned stack of the best images from featured projects
    $("#heroVisual").innerHTML = picks.length
      ? `<div class="stack">${picks.map(({ p, m }, i) => `
          <button class="stack-card s${i}" data-open="${esc(p.id)}" type="button" aria-label="${esc(t(p.title))}">
            ${mediaThumbHTML(m, PF.captionText(m))}
            <span class="stack-label">${icon(catIcon((p.categories || [])[0]))}${esc(shortTitle(p))}</span>
          </button>`).join("")}</div>`
      : profile.photo ? `<div class="hero-photo"><img src="${esc(profile.photo)}" alt="${esc(name())}" /></div>`
      : PF.LOCAL ? `<div class="hero-slot">${icon("image")}<span>${esc(L("هون بتطلع صور مشاريعك", "Your project images show here"))}</span></div>` : "";
    $(".hero-in").classList.toggle("solo", !$("#heroVisual").innerHTML.trim());

    // Stats
    const all = projects.flatMap(projectAll).concat(PF.galleryMedia(), PF.galleryDocs());
    const c = mediaCounts(all);
    const tech = new Set(projects.flatMap((p) => p.tech || []));
    const stats = [
      [projects.length, ui("stat_projects")],
      [c.photo + c.design, ui("stat_images")],
      [c.video, ui("stat_videos")],
      [c.report, ui("stat_reports")],
      [tech.size, ui("stat_tech")]
    ].filter(([n]) => n > 0);
    $("#stats").hidden = stats.length === 0;
    $("#stats").innerHTML = stats.map(([n, label]) =>
      `<div class="stat"><span class="stat-n" data-n="${n}">${state.firstRender && !reduceMotion ? 0 : n}</span><span class="stat-l">${esc(label)}</span></div>`).join("");
  }

  function heroPicks() {
    const picks = [];
    const ordered = projects.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    for (const p of ordered) {
      const m = (mediaOf.get(p.id) || []).filter((x) => x.thumb);
      const pick = m.find((x) => x.kind === "design") || m[0];
      if (pick) picks.push({ p, m: pick });
      if (picks.length === 3) break;
    }
    return picks;
  }

  function startRotator() {
    clearInterval(startRotator._t);
    const roles = t(profile.roles) || [];
    if (roles.length < 2 || reduceMotion) return;
    let i = 0;
    startRotator._t = setInterval(() => {
      const el = $("#rot");
      if (!el) return;
      el.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % roles.length;
        el.textContent = roles[i];
        el.classList.remove("out");
      }, 280);
    }, 2600);
  }

  function countUp() {
    if (reduceMotion) return;
    $$(".stat-n").forEach((el) => {
      const target = +el.dataset.n;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1100);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ── featured ────────────────────────────────────────────────────────── */
  function renderFeatured() {
    const p = projects.find((x) => x.featured);
    const sec = $("#featured-sec");
    if (!p) { sec.hidden = true; return; }
    const media = mediaOf.get(p.id) || [];
    const cover = PF.projectCover(p, media);
    const hl = (t(p.highlights) || []).slice(0, 3);
    const cnt = mediaCounts(projectAll(p));
    $("#featured").innerHTML = `
      <article class="feature reveal">
        <button class="feature-media" data-open="${esc(p.id)}" type="button" aria-label="${esc(ui("open_project"))}">
          ${cover ? `<img src="${esc(cover)}" alt="${esc(t(p.title))}" loading="lazy" decoding="async" />` : genCover(p)}
          <span class="media-badges">${badges(cnt)}</span>
        </button>
        <div class="feature-body">
          <span class="eyebrow">${icon("star")}${esc(ui("featured"))}</span>
          <h2>${esc(t(p.title))}</h2>
          <p class="lead">${esc(t(p.summary))}</p>
          <ul class="checks">${hl.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <ul class="tags">${(p.tech || []).slice(0, 7).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="cta">
            <button class="btn btn-primary" data-open="${esc(p.id)}" type="button">${esc(ui("open_project"))}${icon("arrow", "flip")}</button>
            ${linkButtons(p, "btn-ghost")}
          </div>
        </div>
      </article>`;
  }

  function badges(cnt) {
    return [["photo", "image"], ["design", "pen"], ["video", "video"], ["report", "file"]]
      .filter(([k]) => cnt[k])
      .map(([k, ic]) => `<span class="mbadge" title="${esc(ui("f_" + k))}">${icon(ic)}${cnt[k]}</span>`).join("");
  }

  function linkButtons(p, cls) {
    const l = p.links || {};
    const out = [];
    if (isFilled(l.github)) out.push(`<a class="btn ${cls}" href="${esc(l.github)}" target="_blank" rel="noopener">${icon("github")}${esc(ui("source"))}</a>`);
    if (isFilled(l.demo)) out.push(`<a class="btn ${cls}" href="${esc(l.demo)}" target="_blank" rel="noopener">${icon("external")}${esc(ui("demo"))}</a>`);
    return out.join("");
  }

  /* ── project grid ────────────────────────────────────────────────────── */
  function renderWorkHead() {
    $("#workTitle").textContent = ui("work_title");
    $("#workSub").textContent = ui("work_sub");
    $("#searchIcon").innerHTML = icon("search");
    const input = $("#searchInput");
    input.placeholder = ui("search");
    input.setAttribute("aria-label", ui("search"));
    const used = categories.filter((c) => projects.some((p) => (p.categories || []).includes(c.id)));
    const chip = (id, label, n) =>
      `<button class="chip${state.cat === id ? " on" : ""}" data-cat="${esc(id)}" type="button" aria-pressed="${state.cat === id}">${esc(label)}<span class="n">${n}</span></button>`;
    $("#catChips").innerHTML = chip("all", ui("all"), projects.length) +
      used.map((c) => chip(c.id, t(c), projects.filter((p) => (p.categories || []).includes(c.id)).length)).join("");
  }

  function matches(p) {
    if (state.cat !== "all" && !(p.categories || []).includes(state.cat)) return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    const hay = [t(p.title), t(p.summary), (p.tech || []).join(" "), (p.categories || []).map(catLabel).join(" "),
      p.title && p.title.en, p.title && p.title.ar].join(" ").toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  }

  function renderGrid() {
    if (!projects.length) {
      $("#work").hidden = !PF.LOCAL;
      $(".toolbar").hidden = true;
      $("#projectGrid").innerHTML = `<div class="empty-card">${icon("folder")}<h3>${esc(ui("empty_title"))}</h3><p>${esc(ui("empty_text"))}</p></div>`;
      return;
    }
    const list = projects.filter(matches);
    $("#projectGrid").innerHTML = list.map((p) => {
      const media = mediaOf.get(p.id) || [];
      const cover = PF.projectCover(p, media);
      const cnt = mediaCounts(projectAll(p));
      const tech = p.tech || [];
      return `
        <article class="card reveal" data-open="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(t(p.title))}">
          <div class="card-media">
            ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" />` : genCover(p)}
            <span class="media-badges">${badges(cnt)}</span>
            ${cnt.video ? `<span class="play-dot">${icon("play")}</span>` : ""}
          </div>
          <div class="card-body">
            <div class="card-meta"><span>${esc(p.year || "")}</span>${(p.categories || []).slice(0, 2).map((c) => `<span class="dot-sep">${esc(catLabel(c))}</span>`).join("")}</div>
            <h3>${esc(t(p.title))}</h3>
            <p>${esc(t(p.summary))}</p>
            <ul class="tags">${tech.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join("")}${tech.length > 4 ? `<li class="more">+${tech.length - 4}</li>` : ""}</ul>
          </div>
          <span class="card-arrow">${icon("arrow", "flip")}</span>
        </article>`;
    }).join("");
    const empty = $("#noResults");
    empty.hidden = list.length > 0;
    empty.textContent = ui("no_results");
    observeReveals();
  }

  /* ── gallery wall ────────────────────────────────────────────────────── */
  let wallItems = [];
  function allWallMedia() {
    const out = [];
    projects.forEach((p) => projectAll(p).forEach((m) => out.push({ ...m, project: p })));
    PF.galleryMedia().concat(PF.galleryDocs()).forEach((m) => out.push({ ...m, project: null }));
    return out;
  }

  function renderGallery() {
    const all = allWallMedia();
    const sec = $("#gallery");
    if (!all.length) { sec.hidden = true; return; }
    $("#galleryTitle").textContent = ui("gallery_title");
    $("#gallerySub").textContent = ui("gallery_sub");
    const cnt = mediaCounts(all);
    const kinds = [["all", ui("all"), all.length], ["photo", ui("f_photo"), cnt.photo], ["design", ui("f_design"), cnt.design],
      ["video", ui("f_video"), cnt.video], ["report", ui("f_report"), cnt.report]]
      .filter(([k, , n]) => k === "all" || n > 0);
    if (!kinds.some(([k]) => k === state.kind)) state.kind = "all";
    $("#kindChips").innerHTML = kinds.map(([k, label, n]) =>
      `<button class="chip${state.kind === k ? " on" : ""}" data-kind="${k}" type="button" aria-pressed="${state.kind === k}">${esc(label)}<span class="n">${n}</span></button>`).join("");

    wallItems = all.filter((m) => state.kind === "all" || m.kind === state.kind);
    $("#masonry").innerHTML = wallItems.map((m, i) => {
      const cap = PF.captionText(m);
      const style = m.w && m.h ? ` style="aspect-ratio:${m.w}/${m.h}"` : "";
      return `
        <button class="tile reveal" data-wall="${i}" type="button" aria-label="${esc(cap)}">
          <span class="tile-media"${style}>${mediaThumbHTML(m, cap)}</span>
          ${m.kind === "video" ? `<span class="play">${icon("play")}</span>` : ""}
          <span class="kind-tag">${m.kind === "report" ? `<b>${esc(m.ext || "")}</b>` : icon(m.kind === "design" ? "pen" : m.kind === "video" ? "video" : "image")}</span>
          <span class="tile-cap"><b>${esc(cap)}</b>${m.project ? `<small>${esc(shortTitle(m.project))}</small>` : ""}</span>
        </button>`;
    }).join("");
    observeReveals();
  }

  /* ── setup bar (local preview only) ─────────────────────────────────── */
  function renderSetup() {
    const box = $("#setup");
    if (!PF.LOCAL || PF.readStore("pf-setup-hidden") === "1") { box.hidden = true; return; }
    const links = Object.values(profile.links || {});
    const checks = [
      [isFilled(t(profile.name)), ui("setup_name")],
      [isFilled(t(profile.bio)), ui("setup_bio")],
      [isFilled(profile.email) || links.some(isFilled), ui("setup_contact")],
      [(DATA.projects || []).length > 0, ui("setup_project")],
      [isFilled((DATA.site || {}).url), ui("setup_url")]
    ];
    const built = DATA.generatedAt;
    box.hidden = false;
    box.innerHTML = `<div class="wrap setup-in">
      <div class="setup-head"><b>${icon("tool")}${esc(ui("setup_title"))}</b><span>${esc(ui("setup_note"))}</span>
        <button class="setup-x" id="setupHide" type="button">${esc(ui("hide"))}</button></div>
      <ul class="setup-list">${checks.map(([ok, label]) => `<li class="${ok ? "ok" : ""}">${icon(ok ? "check" : "close")}${esc(label)}</li>`).join("")}</ul>
      <p class="setup-foot">${built ? `${esc(ui("setup_built"))}: <span dir="ltr">${esc(built.replace("T", " "))}</span>` : esc(ui("setup_never"))} · ${esc(ui("setup_rebuild"))}</p>
    </div>`;
  }

  /* ── skills, journey, contact, footer ───────────────────────────────── */
  function renderSkills() {
    $("#skills").hidden = !(DATA.skills || []).length;
    $("#skillsTitle").textContent = ui("skills_title");
    const icons = ["code", "cpu", "eye", "globe", "pen", "layers"];
    $("#skillsGrid").innerHTML = (DATA.skills || []).map((g, i) => `
      <div class="skill-card reveal">
        <h3>${icon(icons[i % icons.length])}${esc(t(g.group))}</h3>
        <ul class="tags lg">${(g.items || []).map((x) => `<li>${esc(t(x))}</li>`).join("")}</ul>
      </div>`).join("");
  }

  function renderJourney() {
    $("#journeyTitle").textContent = ui("journey_title");
    const tIcon = { education: "cap", competition: "trophy", work: "brief", project: "layers" };
    const items = (DATA.timeline || []).filter((x) => isFilled(t(x.title)));
    $("#journey").hidden = !items.length && !(DATA.languages || []).length;
    $("#timeline").innerHTML = items.map((x) => `
      <li class="tl-item reveal">
        <span class="tl-dot">${icon(tIcon[x.type] || "star")}</span>
        <div class="tl-body">
          <div class="tl-when">${esc(isFilled(x.when) ? x.when : "")}${x.type ? `<span class="tl-type">${esc(ui(x.type === "education" ? "edu" : x.type))}</span>` : ""}</div>
          <h3>${esc(t(x.title))}</h3>
          ${isFilled(t(x.place)) ? `<p class="tl-place">${esc(t(x.place))}</p>` : ""}
          ${isFilled(t(x.text)) ? `<p>${esc(t(x.text))}</p>` : ""}
        </div>
      </li>`).join("");
    const langs = DATA.languages || [];
    $("#langs").innerHTML = langs.length ? `<h3>${icon("globe")}${esc(ui("languages"))}</h3>
      <ul>${langs.map((l) => `<li><span>${esc(t(l.name))}</span>${isFilled(t(l.level)) ? `<em>${esc(t(l.level))}</em>` : ""}</li>`).join("")}</ul>` : "";
  }

  function renderContact() {
    const socials = socialLinks().filter((s) => s.key !== "mail");
    const hasMail = isFilled(profile.email);
    $("#contactCard").innerHTML = `
      <div class="contact-text">
        <h2>${esc(ui("contact_title"))}</h2>
        <p>${esc(ui("contact_sub"))}</p>
      </div>
      <div class="contact-actions">
        ${hasMail ? `<a class="btn btn-primary btn-lg" href="mailto:${esc(profile.email)}">${icon("mail")}<span dir="ltr">${esc(profile.email)}</span></a>
          <button class="btn btn-ghost" id="copyMail" type="button">${icon("copy")}${esc(ui("copy_email"))}</button>` : ""}
        ${isFilled(profile.phone) ? `<a class="btn btn-ghost" href="tel:${esc(profile.phone.replace(/\s+/g, ""))}">${icon("phone")}<span dir="ltr">${esc(profile.phone)}</span></a>` : ""}
        <a class="btn btn-ghost" href="${esc(cvHref())}">${icon("download")}${esc(ui("download_cv"))}</a>
        ${socials.map((s) => `<a class="btn btn-ghost" href="${esc(s.href)}" target="_blank" rel="noopener">${icon(s.key)}${esc(s.label)}</a>`).join("")}
      </div>`;
    if (!hasMail) console.info("[portfolio] " + PF.UI.en.email_missing);
  }

  function renderFooter() {
    $("#footer").innerHTML = `<span>© ${new Date().getFullYear()} ${esc(name())}</span><span class="muted">${esc(ui("built_with"))}</span>`;
  }

  /* ── project dialog ─────────────────────────────────────────────────── */
  const modal = $("#projectModal");

  function openProject(id, index) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    state.modalId = id;
    state.modalIndex = index || 0;
    const media = mediaOf.get(id) || [];
    const docs = docsOf.get(id) || [];
    const hl = t(p.highlights) || [];
    const l = p.links || {};
    $("#modalBody").innerHTML = `
      <button class="icon-btn m-close" id="mClose" type="button" aria-label="${esc(ui("close"))}">${icon("close")}</button>
      ${media.length ? `
      <div class="m-media">
        <div class="m-stage" id="mStage"></div>
        ${media.length > 1 ? `
          <button class="lb-btn m-prev" id="mPrev" type="button" aria-label="${esc(ui("prev"))}">${icon("left", "flip")}</button>
          <button class="lb-btn m-next" id="mNext" type="button" aria-label="${esc(ui("next"))}">${icon("right", "flip")}</button>` : ""}
        <button class="lb-btn m-full" id="mFull" type="button" aria-label="${esc(ui("fullscreen"))}">${icon("expand")}</button>
        <div class="m-caption"><span id="mCaption"></span><span id="mCount"></span></div>
      </div>
      ${media.length > 1 ? `<div class="m-thumbs" id="mThumbs">${media.map((m, i) => `
        <button class="m-thumb" data-i="${i}" type="button" aria-label="${esc(PF.captionText(m))}">${mediaThumbHTML(m, "")}${m.type !== "image" ? `<span class="play sm">${icon("play")}</span>` : ""}</button>`).join("")}</div>` : ""}`
      : `<div class="m-media m-nomedia">${genCover(p)}</div>`}
      <div class="m-content">
        <div class="m-main">
          <div class="m-cats">${(p.categories || []).map((c) => `<span class="chip static">${icon(catIcon(c))}${esc(catLabel(c))}</span>`).join("")}</div>
          <h2 id="modalTitle">${esc(t(p.title))}</h2>
          <p class="lead">${esc(t(p.summary))}</p>
          ${hl.length ? `<h3>${esc(ui("highlights"))}</h3><ul class="checks">${hl.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
          ${docs.length ? `<h3>${esc(ui("docs_title"))}</h3><ul class="docs">${docs.map((d, i) => docItemHTML(d, i)).join("")}</ul>` : ""}
        </div>
        <aside class="m-side">
          <dl>
            ${isFilled(t(p.role)) ? `<div><dt>${esc(ui("role"))}</dt><dd>${esc(t(p.role))}</dd></div>` : ""}
            ${p.year ? `<div><dt>${esc(ui("year"))}</dt><dd>${esc(p.year)}</dd></div>` : ""}
            ${isFilled(t(p.status)) ? `<div><dt>${esc(ui("status"))}</dt><dd>${esc(t(p.status))}</dd></div>` : ""}
          </dl>
          ${(p.tech || []).length ? `<h4>${esc(ui("tech"))}</h4><ul class="tags">${p.tech.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          <div class="m-links">
            ${linkButtons(p, "btn-ghost btn-block")}
            ${isFilled(l.video) && !PF.youtubeId(l.video) ? `<a class="btn btn-ghost btn-block" href="${esc(l.video)}" target="_blank" rel="noopener">${icon("video")}${esc(ui("video"))}</a>` : ""}
            <button class="btn btn-ghost btn-block" id="mShare" type="button">${icon("link")}${esc(ui("share"))}</button>
          </div>
        </aside>
      </div>`;

    if (media.length) showModalMedia(state.modalIndex);
    if (!modal.open) {
      modal.showModal();
      document.body.classList.add("locked");
    }
    modal.scrollTop = 0;
    const hash = "#project/" + id;
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  function docItemHTML(d, i) {
    const cap = esc(PF.captionText(d));
    return `<li class="doc">
      <a class="doc-thumb" href="${esc(d.src)}" target="_blank" rel="noopener" data-doc="${i}" tabindex="-1" aria-hidden="true">
        ${d.thumb ? `<img src="${esc(d.thumb)}" alt="" loading="lazy" />` : `${icon("file")}<b>${esc(d.ext || "")}</b>`}</a>
      <div class="doc-info"><b>${cap}</b><small>${PF.docMeta(d)}</small></div>
      <div class="doc-actions">
        <a class="btn btn-ghost btn-sm" href="${esc(d.src)}" target="_blank" rel="noopener" data-doc="${i}">${icon("eye")}${esc(ui("open"))}</a>
        <a class="btn btn-ghost btn-sm" href="${esc(d.src)}" download aria-label="${esc(ui("download"))}">${icon("download")}</a>
      </div>
    </li>`;
  }

  // PDFs open inside the page on big screens; phones handle PDFs better in their own viewer.
  const canEmbedPdf = () => matchMedia("(min-width: 900px) and (hover: hover)").matches;

  function stageHTML(m, autoplay) {
    const cap = esc(PF.captionText(m));
    if (m.kind === "report") {
      if (m.type === "pdf" && canEmbedPdf()) return `<iframe class="pdf" src="${esc(m.src)}#view=FitH" title="${cap}"></iframe>`;
      return `<div class="doc-stage">
        ${m.thumb ? `<img src="${esc(m.thumb)}" alt="" />` : `<span class="doc-icon">${icon("file")}<b>${esc(m.ext || "")}</b></span>`}
        <div><b>${cap}</b><small>${PF.docMeta(m)}</small>
        <span class="doc-actions"><a class="btn btn-primary" href="${esc(m.src)}" target="_blank" rel="noopener">${icon("eye")}${esc(ui("open"))}</a>
        <a class="btn btn-ghost" href="${esc(m.src)}" download>${icon("download")}${esc(ui("download"))}</a></span></div>
      </div>`;
    }
    if (m.type === "image") return `<img src="${esc(m.src)}" alt="${cap}" decoding="async" />`;
    if (m.type === "video") return `<video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ""} controls playsinline preload="metadata"${autoplay ? " autoplay" : ""}></video>`;
    if (m.type === "youtube") {
      if (autoplay) return `<iframe src="https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1&rel=0" title="${cap}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      return `<button class="yt-lite" data-yt type="button" aria-label="${cap}"><img src="${esc(m.poster)}" alt="" /><span class="play lg">${icon("play")}</span></button>`;
    }
    if (m.type === "vimeo") return `<iframe src="https://player.vimeo.com/video/${m.id}" title="${cap}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return "";
  }

  function showModalMedia(i) {
    const media = mediaOf.get(state.modalId) || [];
    if (!media.length) return;
    i = (i + media.length) % media.length;
    state.modalIndex = i;
    const m = media[i];
    const stage = $("#mStage");
    stage.innerHTML = stageHTML(m, false);
    const yt = $("[data-yt]", stage);
    if (yt) yt.addEventListener("click", () => { stage.innerHTML = stageHTML(m, true); });
    $("#mCaption").textContent = PF.captionText(m);
    $("#mCount").textContent = media.length > 1 ? `${i + 1} / ${media.length}` : "";
    $$(".m-thumb").forEach((b) => {
      const on = +b.dataset.i === i;
      b.classList.toggle("on", on);
      if (on) b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  // Cleanup runs both from our own close button and from the dialog's "close" event
  // (Esc key) — some browsers deliver that event late or not at all.
  function closeProject() {
    if (modal.open) modal.close();
    afterProjectClosed();
  }
  function afterProjectClosed() {
    if (state.modalId === null) return;
    state.modalId = null;
    if (!lightbox.open) document.body.classList.remove("locked");
    $("#modalBody").innerHTML = ""; // stops any playing video
    if (location.hash.startsWith("#project/")) history.replaceState(null, "", location.pathname + location.search);
  }
  modal.addEventListener("close", afterProjectClosed);
  modal.addEventListener("cancel", () => setTimeout(afterProjectClosed, 0));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) return closeProject();
    const thumb = e.target.closest(".m-thumb");
    if (thumb) return showModalMedia(+thumb.dataset.i);
    const doc = e.target.closest("[data-doc]");
    if (doc) {
      const docs = docsOf.get(state.modalId) || [];
      const d = docs[+doc.dataset.doc];
      if (d && d.type === "pdf" && canEmbedPdf()) {
        e.preventDefault();
        openLightbox(docs.map((x) => ({ ...x, project: null })), +doc.dataset.doc);
      }
      return; // otherwise the link opens the file in a new tab
    }
    const id = e.target.closest("button") && e.target.closest("button").id;
    if (id === "mClose") closeProject();
    else if (id === "mPrev") showModalMedia(state.modalIndex - 1);
    else if (id === "mNext") showModalMedia(state.modalIndex + 1);
    else if (id === "mFull") openLightbox((mediaOf.get(state.modalId) || []).map((m) => ({ ...m, project: null })), state.modalIndex);
    else if (id === "mShare") copy(location.href.split("#")[0] + "#project/" + state.modalId);
  });
  modal.addEventListener("keydown", (e) => {
    if (lightbox.open || /input|textarea/i.test(e.target.tagName)) return;
    const dir = document.documentElement.dir === "rtl" ? -1 : 1;
    if (e.key === "ArrowRight") showModalMedia(state.modalIndex + dir);
    if (e.key === "ArrowLeft") showModalMedia(state.modalIndex - dir);
  });
  swipe($(".modal-in"), (d) => showModalMedia(state.modalIndex + d), "#mStage");

  /* ── lightbox ────────────────────────────────────────────────────────── */
  const lightbox = $("#lightbox");
  const lb = { items: [], i: 0 };

  function openLightbox(items, i) {
    lb.items = items;
    $("#lbClose").innerHTML = icon("close");
    $("#lbClose").setAttribute("aria-label", ui("close"));
    $("#lbPrev").innerHTML = icon("left", "flip");
    $("#lbPrev").setAttribute("aria-label", ui("prev"));
    $("#lbNext").innerHTML = icon("right", "flip");
    $("#lbNext").setAttribute("aria-label", ui("next"));
    const multi = items.length > 1;
    $("#lbPrev").hidden = !multi;
    $("#lbNext").hidden = !multi;
    showLb(i);
    if (!lightbox.open) lightbox.showModal();
    document.body.classList.add("locked");
  }
  function showLb(i) {
    const n = lb.items.length;
    lb.i = (i + n) % n;
    const m = lb.items[lb.i];
    const stage = $("#lbStage");
    stage.innerHTML = stageHTML(m, false);
    const yt = $("[data-yt]", stage);
    if (yt) yt.addEventListener("click", () => { stage.innerHTML = stageHTML(m, true); });
    const proj = m.project ? ` · ${shortTitle(m.project)}` : "";
    $("#lbCaption").textContent = PF.captionText(m) + proj;
    $("#lbCount").textContent = n > 1 ? `${lb.i + 1} / ${n}` : "";
  }
  function closeLightbox() {
    if (lightbox.open) lightbox.close();
    afterLightboxClosed();
  }
  function afterLightboxClosed() {
    $("#lbStage").innerHTML = "";
    if (!modal.open) document.body.classList.remove("locked");
  }
  lightbox.addEventListener("close", afterLightboxClosed);
  lightbox.addEventListener("cancel", () => setTimeout(afterLightboxClosed, 0));
  lightbox.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b && b.id === "lbClose") return closeLightbox();
    if (b && b.id === "lbPrev") return showLb(lb.i - 1);
    if (b && b.id === "lbNext") return showLb(lb.i + 1);
    if (e.target === lightbox || e.target.id === "lbStage") closeLightbox();
  });
  lightbox.addEventListener("keydown", (e) => {
    const dir = document.documentElement.dir === "rtl" ? -1 : 1;
    if (e.key === "ArrowRight") showLb(lb.i + dir);
    if (e.key === "ArrowLeft") showLb(lb.i - dir);
  });
  swipe(lightbox, (d) => showLb(lb.i + d));

  function swipe(el, go, within) {
    let x0 = null, y0 = null;
    el.addEventListener("touchstart", (e) => {
      if (within && !e.target.closest(within)) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      const rtl = document.documentElement.dir === "rtl";
      go((dx < 0) !== rtl ? 1 : -1);
    }, { passive: true });
  }

  /* ── reveal + active nav ────────────────────────────────────────────── */
  let revealObs = null;
  function observeReveals() {
    const els = $$(".reveal:not(.in)");
    if (reduceMotion || !("IntersectionObserver" in window) || !state.firstRender) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    if (!revealObs) {
      revealObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    els.forEach((el) => revealObs.observe(el));
  }

  function watchSections() {
    if (!("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        $$("#navLinks a").forEach((a) => a.classList.toggle("active", a.dataset.sec === en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["work", "gallery", "skills", "journey", "contact"].forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  }

  /* ── wiring ─────────────────────────────────────────────────────────── */
  function renderAll() {
    document.title = `${name()} — ${L("معرض الأعمال", "Portfolio")}`;
    renderNav();
    renderSetup();
    renderHero();
    renderFeatured();
    renderWorkHead();
    renderGrid();
    renderGallery();
    renderSkills();
    renderJourney();
    renderContact();
    renderFooter();
    observeReveals();
  }

  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]");
    if (open) { e.preventDefault(); openProject(open.dataset.open); return; }
    const cat = e.target.closest("[data-cat]");
    if (cat) { state.cat = cat.dataset.cat; renderWorkHead(); renderGrid(); return; }
    const kind = e.target.closest("[data-kind]");
    if (kind) { state.kind = kind.dataset.kind; renderGallery(); return; }
    const tile = e.target.closest("[data-wall]");
    if (tile) { openLightbox(wallItems, +tile.dataset.wall); return; }
    if (e.target.closest("#copyMail")) { copy(profile.email); return; }
    if (e.target.closest("#setupHide")) { PF.writeStore("pf-setup-hidden", "1"); renderSetup(); return; }
    if (e.target.closest("#navLinks a")) document.body.classList.remove("menu-open");
  });

  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".card[data-open]")) {
      e.preventDefault();
      openProject(e.target.dataset.open);
    }
  });

  $("#searchInput").addEventListener("input", (e) => { state.q = e.target.value; renderGrid(); });

  $("#langBtn").addEventListener("click", () => {
    PF.applyLang(PF.lang === "ar" ? "en" : "ar");
    renderAll();
    startRotator();
    if (state.modalId) openProject(state.modalId, state.modalIndex);
  });

  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    PF.writeStore("pf-theme", next);
    renderNav();
  });

  $("#menuBtn").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("#menuBtn").setAttribute("aria-expanded", open);
  });

  window.addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  function routeFromHash() {
    const m = location.hash.match(/^#project\/(.+)$/);
    if (m) openProject(decodeURIComponent(m[1]));
  }
  window.addEventListener("hashchange", routeFromHash);

  renderAll();
  state.firstRender = false;
  countUp();
  startRotator();
  watchSections();
  routeFromHash();
})();
