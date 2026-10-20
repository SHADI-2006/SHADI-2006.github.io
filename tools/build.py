"""Build the portfolio site from your folders.

    profile/profile.txt          your details, skills, journey, languages
    profile/photo.jpg            optional profile photo (cv.pdf = a ready-made CV, optional)
    projects/<folder>/info.txt   one folder per project, next to its images, videos, designs and PDFs
    gallery/                     designs and photos that don't belong to a project

Writes data/site.js plus web-sized copies in data/cache/. Run it after every change:
double-click update.bat, or:   python tools/build.py

Optional helpers (update.bat installs the first two):
    pillow    -> images are resized for the web and phone photos are turned upright
    pymupdf   -> the first page of each PDF report becomes its thumbnail
    ffmpeg    -> videos without a cover image get one from their first second
"""

import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
PROFILE_DIR = ROOT / "profile"
PROJECTS_DIR = ROOT / "projects"
GALLERY_DIR = ROOT / "gallery"
DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"
OUT = DATA_DIR / "site.js"
INDEX = ROOT / "index.html"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}
RESIZABLE_EXT = {".jpg", ".jpeg", ".png", ".webp"}  # gif (animation), svg, avif are used as they are
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}
UNSUPPORTED = {
    ".heic": "iPhone HEIC photos don't show in browsers - export them as JPG",
    ".heif": "HEIF photos don't show in browsers - export them as JPG",
    ".avi": "AVI doesn't play in browsers - convert it to MP4",
    ".mkv": "MKV doesn't play reliably in browsers - convert it to MP4",
    ".wmv": "WMV doesn't play in browsers - convert it to MP4",
    ".psd": "PSD can't be shown - export a PNG/JPG of the design (you can keep the PSD out of the folder)",
}
SKIP_NAMES = {"info.txt", "desktop.ini", "thumbs.db", ".ds_store"}
FULL_PX, THUMB_PX = 1920, 720
VIDEO_WARN_MB, GITHUB_LIMIT_MB = 50, 95

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None
FFMPEG = shutil.which("ffmpeg")

warnings = []
used_cache = set()


def warn(msg):
    warnings.append(msg)


def relp(p):
    return p.relative_to(ROOT).as_posix()


def url(p):
    return quote(relp(p), safe="/")


def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s.lower())]


# ── info.txt format ─────────────────────────────────────────────────────────
#   key: value          one value (a long value may continue on the next lines)
#   key:                followed by "- item" lines = a list
#   === skill ===       starts a repeated block (skill, timeline, language)
#   # comment

KEY_RE = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$")
BLOCK_RE = re.compile(r"^===\s*([A-Za-z_]+)\s*===$")
YES = {"yes", "y", "true", "1", "on", "نعم", "اي", "إي", "ايه", "أيوه"}


def read_text(path):
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp1256"):  # Notepad saves UTF-8; very old setups save Arabic Windows
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", "replace")


def parse_info(path):
    top, blocks = {}, []
    cur, last = top, None
    if not path.exists():
        return top, blocks
    for line in read_text(path).splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        m = BLOCK_RE.match(s)
        if m:
            cur, last = {}, None
            blocks.append((m.group(1).lower(), cur))
            continue
        if s.startswith("-") and last:
            items = cur.get(last)
            if not isinstance(items, list):
                items = [items] if items else []
            if s[1:].strip():
                items.append(s[1:].strip())
            cur[last] = items
            continue
        m = KEY_RE.match(s)
        if m:
            last = m.group(1).lower()
            cur[last] = m.group(2).strip()
        elif last and isinstance(cur.get(last), str):
            cur[last] = (cur[last] + " " + s).strip()
    return top, blocks


def as_list(v, split=True):
    if not v:
        return []
    if isinstance(v, list):
        return [x for x in v if x]
    if split:
        return [x.strip() for x in re.split(r"[,،]", v) if x.strip()]
    return [v]


def bi(d, key):
    """{'ar': ..., 'en': ...} from key_ar / key_en (a plain key counts for both). None when empty."""
    out = {}
    for lang in ("ar", "en"):
        v = d.get(f"{key}_{lang}") or d.get(key)
        if isinstance(v, list):
            v = " ".join(v)
        if v:
            out[lang] = v
    return out or None


def bi_list(d, key, split=False):
    out = {}
    for lang in ("ar", "en"):
        items = as_list(d.get(f"{key}_{lang}") or d.get(key), split)
        if items:
            out[lang] = items
    return out or None


def yes(v, default=False):
    if not v:
        return default
    return str(v).strip().lower() in YES


def compact(d):
    return {k: v for k, v in d.items() if v not in (None, "", [], {}, False)}


def slugify(s, fallback="item"):
    s = re.sub(r"[^\w]+", "-", s.lower(), flags=re.UNICODE).strip("-_")
    return s or fallback


# ── media ───────────────────────────────────────────────────────────────────

def cache_path(src, tag, ext):
    st = src.stat()
    h = hashlib.sha1(f"{relp(src)}|{st.st_size}|{int(st.st_mtime)}|{tag}".encode()).hexdigest()[:10]
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", src.stem).strip("-")[:40] or "file"
    path = CACHE_DIR / f"{stem}-{h}-{tag}{ext}"
    used_cache.add(path)
    return path


def save_web(im, out, px):
    im = im.copy()
    im.thumbnail((px, px), Image.LANCZOS)
    if im.mode not in ("RGB", "RGBA"):
        has_alpha = "A" in im.getbands() or "transparency" in im.info
        im = im.convert("RGBA" if has_alpha else "RGB")
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=82, method=4)
    return im.size


def optimise_image(src):
    """-> (display url, thumbnail url, width, height). Falls back to the original file."""
    if Image is None or src.suffix.lower() not in RESIZABLE_EXT:
        w = h = None
        if Image is not None and src.suffix.lower() in {".gif", ".avif"}:
            try:
                with Image.open(src) as im:
                    w, h = im.size
            except OSError:
                pass
        return url(src), url(src), w, h
    full, thumb = cache_path(src, "full", ".webp"), cache_path(src, "thumb", ".webp")
    try:
        if full.exists() and thumb.exists():
            with Image.open(full) as im:
                w, h = im.size
        else:
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im)  # phone photos come in sideways otherwise
                w, h = save_web(im, full, FULL_PX)
                save_web(im, thumb, THUMB_PX)
    except Exception as e:  # noqa: BLE001 - one bad file must not stop the build
        warn(f"{relp(src)}: can't read this image ({e}). Open it and save it again as JPG.")
        return url(src), url(src), None, None
    return url(full), url(thumb), w, h


def video_poster(src):
    """A cover for a video: an image with the same name next to it, else a frame grabbed by ffmpeg."""
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        sib = src.with_suffix(ext)
        if sib.exists():
            full, thumb, _, _ = optimise_image(sib)
            return full, thumb
    if not FFMPEG:
        return None, None
    frame = cache_path(src, "poster", ".jpg")
    if not frame.exists():
        frame.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", "1", "-i", str(src), "-frames:v", "1",
                        "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", str(frame)], check=False)
    return (url(frame), url(frame)) if frame.exists() else (None, None)


def pdf_details(src):
    """-> (page count, first-page thumbnail url)."""
    if pymupdf is None:
        return None, None
    thumb = cache_path(src, "page1", ".webp")
    try:
        with pymupdf.open(src) as doc:
            pages = doc.page_count
            if pages and Image is not None and not thumb.exists():
                page = doc[0]
                zoom = THUMB_PX / max(page.rect.width, 1)
                pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
                im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                thumb.parent.mkdir(parents=True, exist_ok=True)
                im.save(thumb, "WEBP", quality=80)
    except Exception as e:  # noqa: BLE001
        warn(f"{relp(src)}: can't open this PDF ({e}).")
        return None, None
    return pages, (url(thumb) if thumb.exists() else None)


def parse_captions(v):
    """'file.jpg | عربي | English' lines -> {file.jpg: {ar, en}}."""
    out = {}
    for line in as_list(v, split=False):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 2 and parts[0]:
            ar = parts[1]
            en = parts[2] if len(parts) > 2 and parts[2] else ar
            out[parts[0].lower()] = compact({"ar": ar or en, "en": en})
    return out


def scan_folder(folder, captions):
    files = sorted((p for p in folder.rglob("*") if p.is_file()),
                   key=lambda p: natural(p.relative_to(folder).as_posix()))
    video_stems = {p.with_suffix("") for p in files if p.suffix.lower() in VIDEO_EXT}
    media, docs = [], []
    for p in files:
        rel = p.relative_to(folder)
        if any(part.startswith((".", "_")) for part in rel.parts) or p.name.lower() in SKIP_NAMES:
            continue
        ext = p.suffix.lower()
        if ext in UNSUPPORTED:
            warn(f"{relp(p)}: {UNSUPPORTED[ext]}")
            continue
        mb = p.stat().st_size / 1e6
        cap = captions.get(p.name.lower())
        design = bool(re.search(r"design|تصميم|تصاميم", rel.as_posix(), re.IGNORECASE))
        if ext in IMAGE_EXT:
            if p.with_suffix("") in video_stems:
                continue  # it's a video's cover
            full, thumb, w, h = optimise_image(p)
            item = {"type": "image", "src": full, "thumb": thumb, "orig": url(p),
                    "kind": "design" if design else "photo", "name": p.name, "w": w, "h": h}
        elif ext in VIDEO_EXT:
            poster, poster_thumb = video_poster(p)
            item = {"type": "video", "src": url(p), "kind": "video", "name": p.name,
                    "poster": poster, "thumb": poster_thumb, "size": p.stat().st_size}
            if mb > GITHUB_LIMIT_MB:
                warn(f"{relp(p)} is {mb:.0f} MB - GitHub refuses files over 100 MB. "
                     "Upload it to YouTube and put the link under 'youtube:' in info.txt.")
            elif mb > VIDEO_WARN_MB:
                warn(f"{relp(p)} is {mb:.0f} MB - it will load slowly. Compress it or use YouTube.")
            if ext == ".mov":
                warn(f"{relp(p)}: .mov may not play in Chrome - convert it to .mp4 (H.264).")
        else:
            pages, thumb = pdf_details(p) if ext == ".pdf" else (None, None)
            docs.append(compact({"type": "pdf" if ext == ".pdf" else "file", "src": url(p), "name": p.name,
                                 "ext": ext.lstrip(".").upper(), "size": p.stat().st_size, "pages": pages,
                                 "thumb": thumb, "kind": "report", "caption": cap}))
            if mb > GITHUB_LIMIT_MB:
                warn(f"{relp(p)} is {mb:.0f} MB - too big for GitHub (100 MB). Compress it or share it from Google Drive.")
            continue
        if cap:
            item["caption"] = cap
        media.append(compact(item))
    return media, docs


# ── categories ──────────────────────────────────────────────────────────────

ICON_HINTS = [
    ("cpu", r"robot|embedded|electronic|arduino|esp|iot|hardware|روبوت|مدمج|الكترون|إلكترون|عتاد"),
    ("eye", r"vision|ai|machine|learning|ml|data|رؤية|ذكاء|تعلم|بيانات"),
    ("code", r"web|app|software|program|site|ويب|تطبيق|برمج|موقع"),
    ("pen", r"design|cad|graphic|ui|ux|3d|تصميم|تصاميم|جرافيك"),
    ("file", r"research|report|paper|study|بحث|تقرير|دراسة"),
    ("tool", r"tool|automation|script|أدوات|اداة|أداة|أتمتة"),
]


def category_icon(label):
    for icon, pattern in ICON_HINTS:
        if re.search(pattern, label, re.IGNORECASE):
            return icon
    return "layers"


def project_categories(d, registry):
    ar = as_list(d.get("category_ar"))
    en = as_list(d.get("category_en") or d.get("category"))
    ids = []
    for i in range(max(len(ar), len(en))):
        label_ar = ar[i] if i < len(ar) else en[i]
        label_en = en[i] if i < len(en) else ar[i]
        cid = slugify(label_en, f"cat-{len(registry) + 1}")
        if cid not in registry:
            registry[cid] = {"id": cid, "ar": label_ar, "en": label_en, "icon": category_icon(f"{label_en} {label_ar}")}
        ids.append(cid)
    return ids


# ── sections ────────────────────────────────────────────────────────────────

def build_project(folder, used_ids, registry):
    info = folder / "info.txt"
    d, _ = parse_info(info)
    if not info.exists():
        warn(f"{relp(folder)}: no info.txt - copy the one from projects/_template and fill it in.")
    pid = slugify(re.sub(r"^\d+[\s._-]*", "", folder.name), "project")
    while pid in used_ids:
        pid += "-2"
    used_ids.add(pid)

    media, docs = scan_folder(folder, parse_captions(d.get("captions")))
    for link in as_list(d.get("youtube"), split=False) + as_list(d.get("video"), split=False):
        media.append({"src": link, "kind": "video"})

    cover = d.get("cover", "").lower()
    pick = next((m for m in media if m.get("name", "").lower() == cover), None) if cover else None
    pick = pick or next((m for m in media if Path(m.get("name", "")).stem.lower() == "cover"), None)
    if pick:
        media.remove(pick)
        media.insert(0, pick)

    folder_title = re.sub(r"^\d+[\s._-]*", "", folder.name).replace("-", " ").replace("_", " ").strip()
    project = {
        "id": pid,
        "folder": relp(folder),
        "title": bi(d, "title") or {"ar": folder_title, "en": folder_title},
        "short": bi(d, "short"),
        "summary": bi(d, "summary"),
        "role": bi(d, "role"),
        "status": bi(d, "status"),
        "year": d.get("year") or "",
        "featured": yes(d.get("featured")),
        "categories": project_categories(d, registry),
        "tech": as_list(d.get("tech")),
        "highlights": bi_list(d, "highlights"),
        "links": compact({"github": d.get("github"), "demo": d.get("demo")}),
        "media": media,
        "docs": docs,
        "hidden": not yes(d.get("show_on_site"), True),
        "cvHidden": not yes(d.get("show_in_cv"), True),
    }
    return compact(project)


def build_profile():
    path = PROFILE_DIR / "profile.txt"
    d, blocks = parse_info(path)
    if not path.exists():
        warn("profile/profile.txt is missing - the site has no name or contact details.")

    photo = next((PROFILE_DIR / f"photo{e}" for e in (".jpg", ".jpeg", ".png", ".webp")
                  if (PROFILE_DIR / f"photo{e}").exists()), None)
    cv_file = PROFILE_DIR / "cv.pdf"
    profile = compact({
        "name": bi(d, "name"),
        "role": bi(d, "role"),
        "roles": bi_list(d, "roles", split=True),
        "bio": bi(d, "bio"),
        "location": bi(d, "location"),
        "available": bi(d, "available"),
        "email": d.get("email"),
        "phone": d.get("phone"),
        "photo": optimise_image(photo)[1] if photo else None,
        "cvFile": url(cv_file) if cv_file.exists() else None,
        "links": compact({k: d.get(k) for k in ("github", "linkedin", "youtube", "instagram", "behance", "website")}),
    })
    site = compact({"url": d.get("site_url"), "defaultLang": (d.get("default_lang") or "ar").lower()})

    skills, timeline, languages = [], [], []
    for name, b in blocks:
        if name == "skill" and as_list(b.get("items")):
            skills.append(compact({"group": bi(b, "group"), "items": as_list(b.get("items"))}))
        elif name == "timeline" and bi(b, "title"):
            timeline.append(compact({"type": (b.get("type") or "work").lower(), "when": b.get("when"),
                                     "title": bi(b, "title"), "place": bi(b, "place"), "text": bi(b, "text")}))
        elif name == "language" and bi(b, "name"):
            languages.append(compact({"name": bi(b, "name"), "level": bi(b, "level")}))
    return site, profile, skills, timeline, languages


def write_meta(site, profile, projects):
    """Title + link-preview tags in index.html (WhatsApp, LinkedIn and Google read these, not the JS)."""
    if not INDEX.exists():
        return
    name = (profile.get("name") or {}).get("en") or (profile.get("name") or {}).get("ar") or "Portfolio"
    role = (profile.get("role") or {}).get("en") or (profile.get("role") or {}).get("ar") or ""
    bio = (profile.get("bio") or {}).get("en") or (profile.get("bio") or {}).get("ar") or role
    image = next((m.get("thumb") for p in projects if p.get("featured") for m in p.get("media", []) if m.get("thumb")), None)
    image = image or next((m.get("thumb") for p in projects for m in p.get("media", []) if m.get("thumb")), None)
    if image and site.get("url"):  # link previews need a full address
        image = site["url"].rstrip("/") + "/" + image
    esc = lambda s: s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")  # noqa: E731
    title = f"{name} — {role}" if role else name
    lines = [f"<title>{esc(title)}</title>",
             f'<meta name="description" content="{esc(bio[:300])}" />',
             '<meta property="og:type" content="website" />',
             f'<meta property="og:title" content="{esc(title)}" />',
             f'<meta property="og:description" content="{esc(bio[:300])}" />']
    if image:
        lines.append(f'<meta property="og:image" content="{esc(image)}" />')
    html = INDEX.read_text(encoding="utf-8")
    block = "<!-- build:meta -->\n  " + "\n  ".join(lines) + "\n  <!-- /build:meta -->"
    new = re.sub(r"<!-- build:meta -->.*?<!-- /build:meta -->", lambda _: block, html, flags=re.DOTALL)
    if new != html:
        INDEX.write_text(new, encoding="utf-8")


def clean_cache():
    if not CACHE_DIR.exists():
        return 0
    stale = [p for p in CACHE_DIR.rglob("*") if p.is_file() and p not in used_cache]
    for p in stale:
        p.unlink()
    return len(stale)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    DATA_DIR.mkdir(exist_ok=True)

    site, profile, skills, timeline, languages = build_profile()
    registry, used_ids, projects = {}, set(), []
    if PROJECTS_DIR.exists():
        for folder in sorted((p for p in PROJECTS_DIR.iterdir() if p.is_dir() and not p.name.startswith(("_", "."))),
                             key=lambda p: natural(p.name)):
            projects.append(build_project(folder, used_ids, registry))
    gallery_media, gallery_docs = ([], [])
    if GALLERY_DIR.exists():
        g, _ = parse_info(GALLERY_DIR / "info.txt")
        gallery_media, gallery_docs = scan_folder(GALLERY_DIR, parse_captions(g.get("captions")))

    data = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "site": site,
        "profile": profile,
        "categories": list(registry.values()),
        "projects": projects,
        "gallery": {"media": gallery_media, "docs": gallery_docs},
        "skills": skills,
        "timeline": timeline,
        "languages": languages,
    }
    OUT.write_text("// Generated by tools/build.py from profile/, projects/ and gallery/ - don't edit by hand.\n"
                   "window.PORTFOLIO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    write_meta(site, profile, projects)
    removed = clean_cache()

    def count(items, kind):
        return sum(1 for m in items if m.get("kind") == kind)

    print(f"\n  Portfolio built -> {relp(OUT)}   ({datetime.now():%H:%M:%S})\n")
    name = (profile.get("name") or {})
    print(f"  Profile : {name.get('en') or name.get('ar') or '(no name yet - fill profile/profile.txt)'}")
    print(f"  Projects: {len(projects)}")
    for p in projects:
        m, docs = p.get("media", []), p.get("docs", [])
        parts = [f"{count(m, 'photo')} photos", f"{count(m, 'design')} designs",
                 f"{count(m, 'video')} videos", f"{len(docs)} reports/files"]
        flags = (" [featured]" if p.get("featured") else "") + (" [hidden on site]" if p.get("hidden") else "")
        print(f"    - {p['folder'].split('/', 1)[1]:<28} " + ", ".join(x for x in parts if not x.startswith("0 ")) + flags)
    if gallery_media or gallery_docs:
        print(f"  Gallery : {len(gallery_media)} images/videos, {len(gallery_docs)} files")
    if removed:
        print(f"  Cleaned : {removed} old cached file(s)")

    missing = []
    if Image is None:
        missing.append("pillow  (images are not resized - the site will be slow with phone photos)")
    if pymupdf is None:
        missing.append("pymupdf (PDF reports get no thumbnail)")
    if missing:
        print("\n  Optional tools missing - install with:  python -m pip install pillow pymupdf")
        for m in missing:
            print(f"    . {m}")
    if warnings:
        print(f"\n  {len(warnings)} thing(s) to check:")
        for w in warnings:
            print(f"    ! {w}")
    print("\n  Next: double-click preview.bat to see the site.\n")


if __name__ == "__main__":
    main()
