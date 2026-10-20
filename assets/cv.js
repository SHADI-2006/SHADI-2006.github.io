/* CV page: an A4 CV generated from data/content.js. Print → "Save as PDF".
   It tries to fit on ONE page by trimming bullet points; if even the tightest
   version is too long it lets the CV run to a second page. */
(function () {
  "use strict";

  const { DATA, t, ui, esc, icon, isFilled } = PF;
  const $ = (s) => document.querySelector(s);
  const profile = DATA.profile || {};
  const site = DATA.site || {};
  const siteUrl = isFilled(site.url) ? site.url : "";
  const A4_PX = (297 * 96) / 25.4;

  // Bullets per project, from roomiest to tightest: [featured, others]
  const DENSITY = [[3, 2], [3, 1], [2, 2], [2, 1], [1, 1]];

  function withLang(url) {
    if (!url) return "";
    const u = new URL(url, location.href);
    u.searchParams.set("lang", PF.lang);
    return u.href;
  }
  function projectUrl(p) {
    if (!siteUrl) return "";
    return p.hidden ? siteUrl : siteUrl.replace(/#.*$/, "") + "#project/" + encodeURIComponent(p.id);
  }

  function contactItems() {
    const l = profile.links || {};
    const out = [];
    if (isFilled(profile.email)) out.push(["mail", profile.email, "mailto:" + profile.email]);
    if (isFilled(profile.phone)) out.push(["phone", profile.phone, "tel:" + profile.phone.replace(/\s+/g, "")]);
    if (isFilled(t(profile.location))) out.push(["pin", t(profile.location), ""]);
    if (siteUrl) out.push(["globe", PF.linkLabel(siteUrl), siteUrl]);
    if (isFilled(l.github)) out.push(["github", PF.linkLabel(l.github), l.github]);
    if (isFilled(l.linkedin)) out.push(["linkedin", PF.linkLabel(l.linkedin), l.linkedin]);
    return out;
  }

  function missingFields() {
    const miss = [];
    const ar = PF.lang === "ar";
    if (!isFilled(profile.email)) miss.push(ar ? "الإيميل" : "email");
    if (!isFilled((profile.links || {}).linkedin)) miss.push(ar ? "رابط لينكدإن" : "LinkedIn");
    if (!(DATA.timeline || []).some((x) => x.type === "education" && isFilled(t(x.title)))) miss.push(ar ? "التعليم (الجامعة والاختصاص)" : "education");
    if ((DATA.languages || []).some((x) => !isFilled(t(x.level)))) miss.push(ar ? "مستوى اللغة" : "language level");
    return miss;
  }

  function paperHTML(density) {
    const ar = PF.lang === "ar";
    const [nFeat, nOther] = density;
    const projects = (DATA.projects || []).filter((p) => !p.cvHidden).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    const experience = (DATA.timeline || []).filter((x) => x.type !== "education" && x.type !== "project" && isFilled(t(x.title)));
    const education = (DATA.timeline || []).filter((x) => x.type === "education" && isFilled(t(x.title)));
    const languages = DATA.languages || [];
    const photo = isFilled(profile.photo) ? profile.photo : "";

    return `
      <header class="cv-head">
        ${photo ? `<img class="cv-photo" src="${esc(photo)}" alt="" />` : ""}
        <div class="cv-id">
          <h1>${esc(t(profile.name))}</h1>
          <p class="cv-role">${esc(t(profile.role))}</p>
          <ul class="cv-contact">${contactItems().map(([ic, label, href]) =>
            `<li>${icon(ic)}${href ? `<a href="${esc(href)}" dir="ltr">${esc(label)}</a>` : `<span>${esc(label)}</span>`}</li>`).join("")}</ul>
        </div>
        ${siteUrl ? `<a class="cv-qr" href="${esc(withLang(siteUrl))}"><span class="qr"></span><small>${esc(ui("cv_scan"))}</small></a>` : ""}
      </header>

      <section class="cv-profile">
        <h2>${esc(ui("cv_profile"))}</h2>
        <p class="cv-summary">${esc(t(profile.bio))}</p>
      </section>

      <div class="cv-body">
        <main class="cv-main">
          <section>
            <h2>${esc(ui("cv_projects"))}</h2>
            ${projects.map((p) => {
              const hl = (t(p.cvHighlights) || t(p.highlights) || []).slice(0, p.featured ? nFeat : nOther);
              const url = projectUrl(p);
              const gh = p.links && isFilled(p.links.github) ? p.links.github : "";
              return `
              <div class="cv-item">
                <div class="cv-item-head">
                  <h3>${esc(t(p.title))}</h3>
                  <span class="cv-links">${url ? `<a href="${esc(url)}">${icon("image")}${esc(ar ? "صور وفيديو" : "Media")}</a>` : ""}${gh ? `<a href="${esc(gh)}">${icon("github")}${esc(ar ? "الكود" : "Code")}</a>` : ""}</span>
                  <span class="cv-date">${esc(p.year || "")}</span>
                </div>
                ${(p.tech || []).length ? `<p class="cv-tech" dir="ltr">${esc(p.tech.join(" · "))}</p>` : ""}
                <ul class="cv-bullets">${hl.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
              </div>`;
            }).join("")}
          </section>
        </main>

        <aside class="cv-side">
          ${education.length ? `
          <section>
            <h2>${esc(ui("cv_education"))}</h2>
            ${education.map((x) => `
              <div class="cv-side-item">
                <h3>${esc(t(x.title))}</h3>
                ${isFilled(t(x.place)) ? `<p>${esc(t(x.place))}</p>` : ""}
                ${isFilled(x.when) ? `<p class="cv-date">${esc(x.when)}</p>` : ""}
                ${isFilled(t(x.text)) ? `<p>${esc(t(x.text))}</p>` : ""}
              </div>`).join("")}
          </section>` : ""}

          ${experience.length ? `
          <section>
            <h2>${esc(ui("cv_experience"))}</h2>
            ${experience.map((x) => `
              <div class="cv-side-item">
                <h3>${esc(t(x.title))}</h3>
                ${isFilled(t(x.place)) || isFilled(x.when) ? `<p class="cv-meta">${esc([t(x.place), isFilled(x.when) ? x.when : ""].filter(Boolean).join(" · "))}</p>` : ""}
                ${isFilled(t(x.text)) ? `<p>${esc(t(x.text))}</p>` : ""}
              </div>`).join("")}
          </section>` : ""}

          <section>
            <h2>${esc(ui("cv_skills"))}</h2>
            ${(DATA.skills || []).map((g) => `
              <div class="cv-side-item">
                <h3>${esc(t(g.group))}</h3>
                <p class="cv-skill-list" dir="ltr">${(g.items || []).map((x) => esc(t(x))).join(" · ")}</p>
              </div>`).join("")}
          </section>

          ${languages.length ? `
          <section>
            <h2>${esc(ui("languages"))}</h2>
            ${languages.map((l) => `<div class="cv-lang"><span>${esc(t(l.name))}</span>${isFilled(t(l.level)) ? `<em>${esc(t(l.level))}</em>` : ""}</div>`).join("")}
          </section>` : ""}
        </aside>
      </div>`;
  }

  /** Pick the roomiest density that still fits on one A4 page (measured off-screen at print width). */
  function bestDensity() {
    const probe = document.createElement("article");
    probe.className = "paper measure";
    probe.setAttribute("aria-hidden", "true");
    document.body.appendChild(probe);
    let pick = DENSITY[DENSITY.length - 1];
    for (const d of DENSITY) {
      probe.innerHTML = paperHTML(d);
      if (probe.scrollHeight <= A4_PX + 1) { pick = d; break; }
    }
    probe.remove();
    return pick;
  }

  function drawQr() {
    const box = document.querySelector("#paper .qr");
    if (!box) return;
    if (typeof window.qrcode !== "function") { box.closest(".cv-qr").remove(); return; } // offline: skip the QR
    const qr = window.qrcode(0, "M");
    qr.addData(withLang(siteUrl));
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }

  function render() {
    const ar = PF.lang === "ar";
    document.title = `${t(profile.name)} — CV`;
    $("#backBtn").innerHTML = `${icon("left", "flip")}<span>${esc(ui("cv_back"))}</span>`;
    $("#backBtn").href = `index.html?lang=${PF.lang}`;
    $("#langBtn").innerHTML = `${icon("globe")}<span>${ar ? "English" : "عربي"}</span>`;
    $("#printBtn").innerHTML = `${icon("printer")}<span>${esc(ui("cv_print"))}</span>`;
    $("#tip").textContent = ui("cv_tip");

    const miss = missingFields();
    const notice = $("#notice");
    notice.hidden = miss.length === 0;
    notice.innerHTML = miss.length
      ? (ar ? "ناقص بالسي في (عبّيه بملف <code>data/content.js</code>): " : "Missing from the CV (fill it in <code>data/content.js</code>): ") + esc(miss.join(ar ? "، " : ", "))
      : "";

    const density = bestDensity();
    $("#paper").innerHTML = paperHTML(density);
    $("#paper").dataset.density = density.join("/");
    drawQr();
  }

  $("#langBtn").addEventListener("click", () => { PF.applyLang(PF.lang === "ar" ? "en" : "ar"); render(); });
  $("#printBtn").addEventListener("click", () => window.print());
  render();
  // Web fonts change line breaks; re-fit once they're in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
