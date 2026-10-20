/* Shared helpers for index.html and cv.html: language, text lookup, media normalisation, icons. */
(function () {
  "use strict";

  const DATA = window.PORTFOLIO || {};
  // Local preview (not the published site): shows setup hints that visitors never see.
  const LOCAL = location.protocol === "file:" || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname);
  const LANGS = ["ar", "en"];

  const UI = {
    ar: {
      nav_work: "المشاريع", nav_gallery: "المعرض", nav_skills: "المهارات", nav_journey: "المسيرة", nav_contact: "تواصل",
      cv: "السي في", download_cv: "تحميل السي في", view_work: "شوف أعمالي", contact_me: "تواصل معي",
      stat_projects: "مشروع", stat_images: "صورة وتصميم", stat_videos: "فيديو", stat_tech: "تقنية",
      featured: "مشروع مميّز", work_title: "المشاريع", work_sub: "كل مشروع فيه الصور والفيديوهات والتفاصيل التقنية — اضغط عليه.",
      all: "الكل", search: "ابحث بالمشاريع أو التقنيات…", no_results: "ما في نتائج.",
      gallery_title: "معرض الصور والتصاميم", gallery_sub: "كل الوسائط من كل المشاريع بمكان واحد.",
      f_photo: "صور", f_design: "تصاميم", f_video: "فيديو",
      skills_title: "المهارات", journey_title: "المسيرة", languages: "اللغات",
      contact_title: "خلّينا نشتغل سوا", contact_sub: "عندك فرصة تدريب أو عمل أو مشروع؟ راسلني.",
      copy_email: "نسخ الإيميل", copied: "انتسخ ✓", email_missing: "ضيف إيميلك بملف data/content.js",
      highlights: "شو عملت", tech: "التقنيات", role: "دوري", year: "السنة", status: "الحالة", links: "روابط",
      open_project: "فتح المشروع", source: "الكود", demo: "تجربة مباشرة", video: "فيديو",
      close: "إغلاق", prev: "السابق", next: "التالي", fullscreen: "ملء الشاشة", share: "نسخ رابط المشروع",
      media_count: "وسائط", no_media: "ما في وسائط لهالمشروع لسا", built_with: "صُمّم وبُني من الصفر",
      edu: "تعليم", competition: "مسابقة", work: "عمل", project: "مشاريع", theme: "تبديل الوضع", menu: "القائمة",
      // CV
      cv_profile: "نبذة", cv_projects: "المشاريع", cv_experience: "الخبرات والمسابقات", cv_education: "التعليم",
      cv_skills: "المهارات", cv_print: "حفظ PDF / طباعة", cv_back: "رجوع للموقع", cv_scan: "امسح لتشوف المشاريع بالصور والفيديو",
      cv_portfolio: "معرض الأعمال", cv_tip: "نصيحة: بنافذة الطباعة اختار «حفظ كـ PDF» وألغِ «الرؤوس والتذييلات».",
      f_report: "تقارير وملفات", stat_reports: "تقرير وملف", docs_title: "التقارير والملفات", open: "فتح", download: "تحميل",
      pages: "صفحة", portfolio: "معرض الأعمال", your_name: "اسمك",
      empty_title: "لسا ما في مشاريع", empty_text: "انسخ مجلد projects/_template، سمّيه باسم مشروعك، حط فيه الصور والفيديوهات والتقارير وعبّي info.txt، وبعدين شغّل update.bat.",
      setup_title: "وضع التجهيز", setup_note: "هالشريط بيطلع عندك على الجهاز بس — الزوار ما بيشوفوه.", setup_built: "آخر تحديث للموقع",
      setup_name: "اسمك (profile.txt)", setup_bio: "النبذة (profile.txt)", setup_contact: "إيميل أو رابط تواصل", setup_project: "مشروع واحد على الأقل (projects/)",
      setup_url: "رابط الموقع site_url (بعد النشر)", setup_rebuild: "بعد أي تعديل: دبل كليك على update.bat وحدّث الصفحة.", setup_never: "لسا ما انبنى — شغّل update.bat",
      hide: "إخفاء"
    },
    en: {
      nav_work: "Work", nav_gallery: "Gallery", nav_skills: "Skills", nav_journey: "Journey", nav_contact: "Contact",
      cv: "CV", download_cv: "Download CV", view_work: "View my work", contact_me: "Get in touch",
      stat_projects: "projects", stat_images: "images & designs", stat_videos: "videos", stat_tech: "technologies",
      featured: "Featured project", work_title: "Projects", work_sub: "Every project with its images, videos and technical details — click to open.",
      all: "All", search: "Search projects or tech…", no_results: "No results.",
      gallery_title: "Images & designs", gallery_sub: "All media from every project in one place.",
      f_photo: "Photos", f_design: "Designs", f_video: "Videos",
      skills_title: "Skills", journey_title: "Journey", languages: "Languages",
      contact_title: "Let's build something", contact_sub: "Have an internship, a role or a project in mind? Write to me.",
      copy_email: "Copy email", copied: "Copied ✓", email_missing: "Add your email in data/content.js",
      highlights: "What I built", tech: "Tech", role: "Role", year: "Year", status: "Status", links: "Links",
      open_project: "Open project", source: "Source", demo: "Live demo", video: "Video",
      close: "Close", prev: "Previous", next: "Next", fullscreen: "Full screen", share: "Copy project link",
      media_count: "media", no_media: "No media for this project yet", built_with: "Designed & built from scratch",
      edu: "Education", competition: "Competition", work: "Work", project: "Projects", theme: "Toggle theme", menu: "Menu",
      cv_profile: "Profile", cv_projects: "Projects", cv_experience: "Experience & competitions", cv_education: "Education",
      cv_skills: "Skills", cv_print: "Save PDF / Print", cv_back: "Back to site", cv_scan: "Scan to see the projects with photos & video",
      cv_portfolio: "Portfolio", cv_tip: "Tip: in the print dialog choose “Save as PDF” and turn off “Headers and footers”.",
      f_report: "Reports & files", stat_reports: "reports & files", docs_title: "Reports & files", open: "Open", download: "Download",
      pages: "pages", portfolio: "Portfolio", your_name: "Your name",
      empty_title: "No projects yet", empty_text: "Copy projects/_template, rename it after your project, add its photos, videos and reports, fill info.txt, then run update.bat.",
      setup_title: "Setup mode", setup_note: "Only you see this bar, on your computer — visitors never do.", setup_built: "Site last built",
      setup_name: "Your name (profile.txt)", setup_bio: "Bio (profile.txt)", setup_contact: "Email or a contact link", setup_project: "At least one project (projects/)",
      setup_url: "Site address site_url (after publishing)", setup_rebuild: "After any change: double-click update.bat and refresh.", setup_never: "Not built yet — run update.bat",
      hide: "Hide"
    }
  };

  function readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode: fine */ }
  }

  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    const saved = readStore("pf-lang");
    if (LANGS.includes(saved)) return saved;
    const def = DATA.site && DATA.site.defaultLang;
    return LANGS.includes(def) ? def : "ar";
  }

  let lang = initialLang();

  function applyLang(l) {
    lang = l;
    writeStore("pf-lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", l);
      history.replaceState(null, "", url);
    }
  }

  /** Text lookup: accepts "plain", {ar, en}, or arrays of either. */
  function t(v) {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (Array.isArray(v)) return v;
    const out = v[lang] != null ? v[lang] : (v.en != null ? v.en : v.ar);
    return out == null ? "" : out;
  }
  const ui = (key) => (UI[lang] && UI[lang][key]) || UI.en[key] || key;

  /** A value is unfinished when it's empty or still a "[placeholder]". */
  const isFilled = (s) => !!s && !/^\s*\[.*\]\s*$/.test(s) && !/\[[^\]]+\]/.test(s);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

  function youtubeId(src) {
    const m = String(src).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function vimeoId(src) {
    const m = String(src).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }

  function fileName(src) {
    return decodeURIComponent(String(src).split(/[\\/]/).pop().split("?")[0]);
  }
  function prettyName(src) {
    const n = fileName(src).replace(/\.[^.]+$/, "").replace(/^\d+[-_ ]*/, "").replace(/[-_]+/g, " ").trim();
    return /^cover$/i.test(n) ? "" : n;
  }

  /** Normalise one media entry to {type, src, poster, thumb, kind, caption, w, h}. */
  function normMedia(item, captions) {
    if (typeof item === "string") item = { src: item };
    const src = item.src || "";
    const yt = youtubeId(src);
    const vm = !yt && vimeoId(src);
    let type = item.type;
    if (!type) type = yt ? "youtube" : vm ? "vimeo" : VIDEO_RE.test(src) ? "video" : "image";
    const kind = item.kind || (type === "image" ? (/design/i.test(src) ? "design" : "photo") : "video");
    const ytThumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "";
    return {
      type, src, kind,
      caption: item.caption || null,
      id: yt || vm || null,
      poster: item.poster || ytThumb,
      thumb: item.thumb || (type === "image" ? src : (item.poster || ytThumb)),
      orig: item.orig || src,
      name: item.name || fileName(src),
      w: item.w, h: item.h,
      fallbackCaption: prettyName(item.name || src)
    };
  }

  /** Reports and other files: {type: "pdf"|"file", src, name, ext, size, pages, thumb, caption}. */
  function normDoc(d) {
    return { ...d, kind: "report", fallbackCaption: prettyName(d.name || d.src) };
  }

  const projectMedia = (p) => (p.media || []).map(normMedia);
  const projectDocs = (p) => (p.docs || []).map(normDoc);
  const galleryMedia = () => ((DATA.gallery && DATA.gallery.media) || []).map(normMedia);
  const galleryDocs = () => ((DATA.gallery && DATA.gallery.docs) || []).map(normDoc);

  function fmtSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / 1e6;
    return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  }
  /** "PDF · 26 pages · 957 KB" as HTML; each part isolated so Arabic/English order stays right. */
  function docMeta(d) {
    return [d.ext, d.pages ? `${d.pages} ${ui("pages")}` : "", fmtSize(d.size)].filter(Boolean)
      .map((x) => `<bdi>${esc(x)}</bdi>`).join(" · ");
  }

  function projectCover(p, media) {
    if (p.cover) return p.cover;
    const first = (media || projectMedia(p)).find((m) => m.thumb);
    return first ? first.thumb : "";
  }

  function captionText(m) {
    return m.caption ? t(m.caption) : m.fallbackCaption;
  }

  /* Small inline icon set (24px, stroke-based). */
  const P = {
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5"/>',
    behance: '<path d="M3 7h5a2.5 2.5 0 0 1 0 5H3zm0 5h5.5a2.5 2.5 0 0 1 0 5H3zM14 13.5h7a3.5 3.5 0 1 0-1 2.5M15 7h5"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    video: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
    brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'
  };
  function icon(name, cls) {
    return `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
  }

  function linkLabel(url) {
    return String(url).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }

  window.PF = {
    DATA, UI, LANGS, LOCAL,
    get lang() { return lang; },
    applyLang, t, ui, esc, icon, isFilled,
    normMedia, projectMedia, projectDocs, galleryMedia, galleryDocs, projectCover, captionText, youtubeId, linkLabel,
    fmtSize, docMeta,
    readStore, writeStore
  };
  applyLang(lang);
})();
