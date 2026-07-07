# DESIGN.md — HQ Slate

Reverse-extracted design system for **Corp Management — SEA IT Infrastructure Registry**.
Source: `themes.html` (Theme 01 · HQ Slate). This is the **primary styling source** for scaffold and mockup.

> **HQ Slate** — a deep navy command console with a blue action accent. Conservative,
> high-trust, and dense — built for HQ admins moving between four countries and many record
> types all day. Accessibility-first typography.

---

## 1. Design Language

| Trait | Value |
|-------|-------|
| Mood | Enterprise, conservative, high-trust, information-dense |
| Mode | Light |
| Accent strategy | Navy brand + single blue CTA accent |
| Density | Compact (14px base, tight paddings) |
| Corner style | Soft (8px cards, 6px controls, pill for chips/segments) |
| Motion | Subtle (150–250ms ease transitions, fade on theme/route change) |

---

## 2. Design Tokens

All component CSS reads **only** from these tokens. Nothing is hard-coded per component.
Set on `:root` (or `body[data-theme="slate"]`).

```css
:root {
  /* ---- Typography ---- */
  --font-head: 'Lexend', system-ui, sans-serif;        /* headings, labels, numerics */
  --font-body: 'Source Sans 3', system-ui, sans-serif;  /* body copy, inputs */
  --font-mono: 'JetBrains Mono', ui-monospace, monospace; /* hostnames, IPs, codes */

  /* ---- Surfaces ---- */
  --bg:          #EEF1F6;   /* app backdrop */
  --surface:     #FFFFFF;   /* cards, panels */
  --surface-2:   #F7F9FC;   /* subtle raised / hovered rows / filter bars */

  /* ---- Sidebar (deep navy rail) ---- */
  --sidebar:            #0F172A;
  --sidebar-fg:         #C7D2E4;
  --sidebar-active:     #1E293B;
  --sidebar-active-fg:  #FFFFFF;

  /* ---- Brand + action ---- */
  --primary:      #1E3A5F;  /* navy — headers, brand, topbars */
  --primary-fg:   #FFFFFF;
  --accent:       #0369A1;  /* blue — primary CTA, links, focus */
  --accent-fg:    #FFFFFF;
  --accent-weak:  #E7F0F7;  /* accent tint — role pill, active bg */

  /* ---- Text ---- */
  --fg:         #101828;    /* body text */
  --fg-muted:   #5A6779;    /* secondary text, labels */
  --fg-subtle:  #8592A6;    /* placeholders, meta, hints */

  /* ---- Lines ---- */
  --border:        #DDE3EC;
  --border-strong: #C4CDDB;

  /* ---- Status (fg + bg tint pairs) ---- */
  --ok:     #0E7C4A;  --ok-bg:     #E4F4EC;
  --warn:   #B4690E;  --warn-bg:   #FBEFDD;
  --danger: #C0342B;  --danger-bg: #FBE7E6;
  --info:   #0369A1;  --info-bg:   #E7F0F7;

  /* ---- Radius ---- */
  --radius:      8px;
  --radius-sm:   6px;
  --radius-pill: 999px;

  /* ---- Elevation ---- */
  --shadow-sm: 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.05);
  --shadow-md: 0 4px 12px rgba(16,24,40,.08);

  /* ---- Focus ring ---- */
  --ring: 0 0 0 3px rgba(3,105,161,.25);
}
```

### Token usage map

| Token | Used for |
|-------|----------|
| `--bg` | Page background, login backdrop |
| `--surface` | Cards, panels, table body, inputs, topbar |
| `--surface-2` | Row hover, filter bar, table head, mini stat tiles, form footer |
| `--sidebar*` | Left navigation rail only |
| `--primary` | Brand/top switcher bar, brand marks fallback |
| `--accent` | Primary buttons, links, KPI accent bar, focus ring, active nav marker |
| `--accent-weak` | Role pill background, active-state tints |
| `--fg / -muted / -subtle` | Text hierarchy (3 levels) |
| `--ok/warn/danger/info` | Status chips, freshness, alerts, validation |

---

## 3. Typography

```css
body { font-family: var(--font-body); font-size: 14px; line-height: 1.5;
       color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
h1,h2,h3,h4 { font-family: var(--font-head); margin: 0; color: var(--fg);
              letter-spacing: -.01em; }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
```

Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Type scale (observed)

| Role | Size | Weight | Family |
|------|------|--------|--------|
| Page title (h3) | 19px | 600 | head |
| Section heading (h2) | 23px | 600 | head |
| Panel/card title (h4) | 14px | 600 | head |
| KPI number | 30px | 700 | head, `-.02em`, tabular |
| Body | 14px | 400 | body |
| Table cell | 13px | 400 | body |
| Label / control | 12–13px | 600 | head |
| Meta / hint | 11–12px | 400 | body, subtle |
| Section label (eyebrow) | 11px | 700 | head, `.1em`, UPPERCASE |
| Mono (host/IP) | 12.5px | 500 | mono |

---

## 4. Layout Scaffold

Two-pane app shell: fixed **224px navy rail** + fluid **main** (topbar + scrolling content).

```css
.app  { display:flex; background:var(--surface); border:1px solid var(--border);
        border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow-md);
        min-height:560px; }
.rail { width:224px; flex:0 0 auto; background:var(--sidebar); color:var(--sidebar-fg);
        padding:16px 12px; display:flex; flex-direction:column; }
.main { flex:1; display:flex; flex-direction:column; min-width:0; }
.topbar  { display:flex; align-items:center; gap:14px; padding:13px 20px;
           border-bottom:1px solid var(--border); background:var(--surface); }
.content { padding:22px; overflow:auto; }
```

**Responsive** (`max-width:960px`): hide `.rail`, collapse KPI grid to 2 cols, forms + 2-up utilities to 1 col.

---

## 5. UI Components

### 5.1 Sidebar navigation

```css
.rail .logo { display:flex; align-items:center; gap:10px; padding:4px 8px 16px; }
.rail .logo .mark { width:30px; height:30px; border-radius:8px; background:var(--accent);
  color:var(--accent-fg); display:grid; place-items:center; font-family:var(--font-head);
  font-weight:700; font-size:15px; }
.rail .grp { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  opacity:.5; margin:16px 10px 6px; }
.nav { display:flex; align-items:center; gap:10px; padding:9px 10px;
  border-radius:var(--radius-sm); cursor:pointer; font-size:13px; font-weight:500;
  color:var(--sidebar-fg); transition:background .15s; }
.nav:hover { background:rgba(255,255,255,.06); }
.nav.active { background:var(--sidebar-active); color:var(--sidebar-active-fg); font-weight:600; }
.nav .count { margin-left:auto; font-family:var(--font-mono); font-size:11px;
  background:rgba(255,255,255,.1); color:var(--sidebar-active-fg);
  padding:1px 8px; border-radius:var(--radius-pill); }
.rail .foot { margin-top:auto; display:flex; align-items:center; gap:9px;
  padding:10px 8px 2px; border-top:1px solid rgba(255,255,255,.08); }
```

### 5.2 Buttons

```css
.btn { display:inline-flex; align-items:center; gap:7px; font-family:var(--font-head);
  font-weight:600; font-size:13px; padding:9px 16px; border-radius:var(--radius-sm);
  cursor:pointer; border:1px solid transparent; transition:all .16s ease; white-space:nowrap; }
.btn:focus-visible { outline:none; box-shadow:var(--ring); }
.btn.primary { background:var(--accent); color:var(--accent-fg); }
.btn.primary:hover { filter:brightness(1.07); }
.btn.ghost { background:var(--surface); color:var(--fg); border-color:var(--border-strong); }
.btn.ghost:hover { background:var(--surface-2); }
.btn.subtle { background:transparent; color:var(--fg-muted); border-color:var(--border); }
.btn.subtle:hover { color:var(--fg); background:var(--surface-2); }
.btn.sm { padding:6px 11px; font-size:12px; }
```

Variants: **primary** (blue CTA), **ghost** (outlined secondary), **subtle** (quiet). `.sm` modifier for dense contexts.

### 5.3 KPI cards

```css
.kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
.kpi { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius);
  padding:16px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden; }
.kpi::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px;
  background:var(--accent); }              /* left accent bar */
.kpi.k-warn::before   { background:var(--warn); }
.kpi.k-danger::before { background:var(--danger); }
.kpi .lab  { font-size:12px; color:var(--fg-muted); display:flex; align-items:center; gap:7px; }
.kpi .num  { font-family:var(--font-head); font-size:30px; font-weight:700; margin-top:6px;
  letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.kpi .num small { font-size:15px; color:var(--fg-subtle); font-weight:500; }
.kpi .delta { font-size:11.5px; margin-top:6px; color:var(--fg-subtle);
  display:flex; align-items:center; gap:5px; }
.kpi .delta .up { color:var(--ok); }  .kpi .delta .down { color:var(--danger); }
```

### 5.4 Status chips

```css
.chip { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600;
  padding:3px 10px; border-radius:var(--radius-pill); font-family:var(--font-head); line-height:1.4; }
.chip .d { width:6px; height:6px; border-radius:50%; }
.chip.ok      { color:var(--ok);     background:var(--ok-bg); }      .chip.ok .d     { background:var(--ok); }
.chip.warn    { color:var(--warn);   background:var(--warn-bg); }    .chip.warn .d   { background:var(--warn); }
.chip.danger  { color:var(--danger); background:var(--danger-bg); }  .chip.danger .d { background:var(--danger); }
.chip.info    { color:var(--info);   background:var(--info-bg); }    .chip.info .d   { background:var(--info); }
.chip.neutral { color:var(--fg-muted); background:var(--surface-2); border:1px solid var(--border); }
```

Semantic map: **ok** = Fresh/Active/Healthy · **warn** = Stale · **danger** = Faulty/Expired · **info** = Pilot · **neutral** = Archived.

### 5.5 Panel + data table

```css
.panel { background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-sm); overflow:hidden; }
.panel .ph { display:flex; align-items:center; gap:12px; padding:14px 16px;
  border-bottom:1px solid var(--border); }
.panel .ph h4 { font-size:14px; font-weight:600; }
.filters { display:flex; gap:8px; flex-wrap:wrap; padding:12px 16px;
  border-bottom:1px solid var(--border); background:var(--surface-2); }

table { width:100%; border-collapse:collapse; }
thead th { text-align:left; font-family:var(--font-head); font-size:11px; font-weight:700;
  letter-spacing:.05em; text-transform:uppercase; color:var(--fg-subtle);
  padding:11px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); }
tbody td { padding:12px 16px; border-bottom:1px solid var(--border); font-size:13px; color:var(--fg); }
tbody tr:last-child td { border-bottom:0; }
tbody tr:hover { background:var(--surface-2); }
td .host { font-family:var(--font-mono); font-size:12.5px; font-weight:500; }  /* hostnames/IPs */
td .sub  { color:var(--fg-subtle); font-size:11.5px; }

.iconbtn { width:30px; height:30px; display:grid; place-items:center;
  border-radius:var(--radius-sm); border:1px solid var(--border);
  background:var(--surface); color:var(--fg-muted); cursor:pointer; }
.iconbtn:hover { background:var(--surface-2); color:var(--fg); }
```

Always render hostnames, IPs, circuit IDs, and codes in `.host` / `.mono` (tabular mono).

### 5.6 Forms

```css
.formgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px 18px; padding:18px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field.span2 { grid-column:span 2; }
.field label { font-size:12px; font-weight:600; color:var(--fg-muted); font-family:var(--font-head); }
.field label .req { color:var(--danger); }
.input, .textarea { font:inherit; font-size:13px; color:var(--fg); background:var(--surface);
  border:1px solid var(--border-strong); border-radius:var(--radius-sm); padding:9px 11px;
  transition:border .15s, box-shadow .15s; }
.input::placeholder { color:var(--fg-subtle); }
.input:focus, .textarea:focus { outline:none; border-color:var(--accent); box-shadow:var(--ring); }
.textarea { resize:vertical; min-height:64px; font-family:var(--font-body); }
.field .help  { font-size:11px; color:var(--fg-subtle); }
.field.err .input { border-color:var(--danger); }
.field .errmsg { font-size:11px; color:var(--danger); display:flex; align-items:center; gap:5px; }
.formbar { display:flex; align-items:center; gap:10px; padding:14px 18px;
  border-top:1px solid var(--border); background:var(--surface-2); }
.formbar .note { font-size:12px; color:var(--fg-subtle); margin-right:auto; }
```

Patterns: required marker `*` in `--danger`; inline error via `.field.err` + `.errmsg`; helper text in `.help`; footer note documents side effects (e.g. audit log write).

### 5.7 Search + role pill (topbar)

```css
.search { flex:1; max-width:440px; display:flex; align-items:center; gap:9px; height:38px;
  padding:0 13px; background:var(--surface-2); border:1px solid var(--border);
  border-radius:var(--radius-pill); color:var(--fg-subtle); font-size:13px; }
.kbd { margin-left:auto; font-family:var(--font-mono); font-size:11px;
  border:1px solid var(--border-strong); border-radius:5px; padding:1px 6px; color:var(--fg-subtle); }
.role { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600;
  color:var(--accent); background:var(--accent-weak); padding:6px 12px;
  border-radius:var(--radius-pill); font-family:var(--font-head); }
.role .dot { width:7px; height:7px; border-radius:50%; background:var(--accent); }
```

### 5.8 Select / dropdown trigger

```css
.select { display:inline-flex; align-items:center; gap:8px; font-size:12.5px; font-weight:500;
  color:var(--fg); background:var(--surface); border:1px solid var(--border-strong);
  border-radius:var(--radius-sm); padding:7px 11px; cursor:pointer; }
.select svg { opacity:.6; }   /* chevron */
```

### 5.9 Login card

```css
.loginwrap { display:flex; align-items:center; justify-content:center; padding:34px;
  background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); }
.logincard { width:360px; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); box-shadow:var(--shadow-md); padding:26px; }
.logincard .mark { width:34px; height:34px; border-radius:9px; background:var(--accent);
  color:var(--accent-fg); display:grid; place-items:center; font-family:var(--font-head); font-weight:700; }
```

Note: **no public sign-up** — accounts are invited by HQ admin.

---

## 6. Iconography

Inline SVG, `viewBox="0 0 24 24"`, `fill="none" stroke="currentColor" stroke-width="2"`.
Nav icons ~17px, search 16px, chevrons 12–14px. Inherit color via `currentColor`.

---

## 7. Motion

```css
body { transition: background .25s ease, color .25s ease; }
.fadein { animation: fade .35s ease; }
@keyframes fade { from { opacity:.4 } to { opacity:1 } }
```

Buttons/inputs transition `.15–.18s ease`. Keep motion subtle and functional.

---

## 8. Brand Mark

Rounded square (`8–9px` radius), `--accent` fill, `--accent-fg` text, `Lexend` 700 — monogram **"CM"**. Sizes: 30px (rail/switcher), 34px (login).

---

## 9. Do / Don't

- **Do** drive every color from tokens; never hard-code hex in components.
- **Do** use mono + tabular numerics for hostnames, IPs, circuit IDs, and metrics.
- **Do** keep one accent (blue) as the single CTA color; navy is brand/structure, not action.
- **Do** store credential *references* only — never secrets in fields.
- **Don't** introduce a second bright accent or gradients on content surfaces.
- **Don't** exceed the 3-level text hierarchy (`--fg` / `--fg-muted` / `--fg-subtle`).
- **Don't** enlarge radii beyond the scale (8 / 6 / pill).
