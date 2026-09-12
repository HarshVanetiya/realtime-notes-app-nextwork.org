# Prism — design language

This replaces an earlier spec that described a *"strictly flat"* interface
relying on *"clean border definitions and subtle shadows rather than gradients
or glowing effects."* That document is no longer true of this codebase, and a
design doc that contradicts the product is worse than none — so it has been
rewritten rather than left to rot.

The short version: **one beam in, a spectrum out.** A prism takes a single input
and returns colour, and the interface does the same — one accent for the
utilitarian work, a full spectrum where the product introduces itself.

---

## Tokens

Everything lives in `app/globals.css` as CSS custom properties, driven by the
`.dark` class on `<html>`. Nothing hard-codes a colour.

### The base palette

Indigo, in two steps, because no single lightness clears WCAG AA both as a
filled button and as body text on the page background:

| Token | Use |
|---|---|
| `--primary` | Filled surfaces. White on it: **8.02:1** (light) |
| `--primary-text` | The same hue as *text*. On card: **10.01:1** (light), **6.66:1** (dark) |
| `--muted-foreground` | Secondary text. AA at body size in both themes |

Never use `text-primary` for body copy — it is a surface colour and fails as
text. That is what `--primary-text` exists for.

### The spectrum

Used for the landing page, the app's primary actions, and the mark:

```
--spectrum-blue    217 91% 60%
--spectrum-violet  258 90% 66%
--spectrum-pink    292 84% 61%
--spectrum-amber    25 95% 63%
--spectrum-teal    172 66% 50%
```

Spectrum colours are **decoration and affordance, never information**. Body text
is never a spectrum colour; a gradient's contrast cannot be measured, and the
one place gradient text appears (`.text-spectrum`) is display-size headings
where it is comfortably above threshold at every stop.

### Motion

One scale, so nothing moves at an arbitrary speed:

```
--duration-instant  90ms    --ease-standard  cubic-bezier(0.2, 0, 0, 1)
--duration-fast    150ms    --ease-entrance  cubic-bezier(0.05, 0.7, 0.1, 1)
--duration-base    220ms    --ease-exit      cubic-bezier(0.3, 0, 0.8, 0.15)
--duration-slow    320ms    --ease-spring    cubic-bezier(0.34, 1.36, 0.64, 1)
```

---

## The one rule that matters: what may animate

**Only `transform` and `opacity`.** Both are handled by the compositor without
touching layout, paint, or the main thread.

This is not a stylistic preference, it is the single largest performance finding
in this project, learned twice:

1. `backdrop-blur` on every note card blurred a flat background for no visual
   gain: p95 frame **33.4ms → 16.8ms**, dropped frames **26% → 2.5%** on removal.
2. The landing page's aurora shipped as blurred blobs that **scaled** as they
   drifted. Scaling a blurred layer invalidates its rasterisation, so every
   frame redrew a 900px gradient: p95 **183ms**, **77%** of frames dropped at 4×
   CPU throttle. Removing `filter: blur()` and the `scale()` took it to p95
   **16.8ms** and **4.6%**.

The corollaries:

- **Softness comes from the gradient, not from a filter.** A radial gradient
  that fades to `transparent` has no hard edge to blur. `AmbientWash` and
  `Aurora` both rely on this and use no filter at all.
- **`backdrop-filter` is re-evaluated on every composited frame.** Acceptable on
  a 64px fixed nav (`backdrop-blur-md`); never on a large panel, and never on
  something already ~94% opaque, where it is invisible anyway.
- **Blur set once and never transformed is fine.** Blur that scales is not.

## Reduced motion

The global `prefers-reduced-motion` rule collapses animation and transition
durations to `0.01ms`. Two things must opt out of that, or the page breaks:

- `.reveal` — otherwise scroll-revealed content stays at `opacity: 0` **forever**
  and the page renders blank. It is forced visible instead.
- `.text-spectrum` keeps its painted fill; only the pan stops.

`Reveal` also carries a 2.5s failsafe timer, so content appears even if
`IntersectionObserver` never fires. **A missing animation is a non-event; hidden
content is a broken page.**

---

## Surfaces

| Class | What it is |
|---|---|
| `.glass-panel` | Translucent card with a 1px gradient stroke, drawn by masking a padding box out of a filled one (a `border-image` cannot follow a `border-radius`) |
| `.glass-panel.is-floating` | The same, at 94% opacity — for panels that overlap other content, where 62% let the text collide with what was underneath |
| `.spatial-panel` | Apple Vision-inspired translucent overlay. `backdrop-filter: blur(40px) saturate(1.4)` on a semi-opaque fill (78% light / 68% dark), with the tile system's hairline border, lit top-edge, and lifted shadow. Acceptable on small, fixed-size overlays (bookmarks, preferences, command palette). **Never on full-screen or animated surfaces.** |
| `.btn-spectrum` | The primary action. Gradient pans on hover, lifts 1px, settles on press |
| `.bg-spectrum-soft` | A hover bloom for cards — opacity only, so it composites |
| `.dot-field` | Depth, masked to fade from the centre so it reads as atmosphere rather than wallpaper |

## Layout

- Radius: `--radius: 1rem`, with `rounded-2xl`/`rounded-3xl` for cards and panels
- Touch targets: 40px minimum on touch, tighter on `[@media(hover:hover)]`
- Hover-revealed controls use `[@media(hover:hover)]` — on touch there is no
  hover, so a hidden-but-tappable Delete is a trap
- Every interactive element gets a focus ring from the `:where(...)` floor in
  `globals.css`, which contributes zero specificity and so is overridable

## Accessibility floor

Non-negotiable, and checked with axe-core on every change:

- Zero violations across `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and
  `best-practice`, in **both** themes
- One `<main>` landmark per page, with all content inside a landmark
- Decorative illustration is `aria-hidden`; anything it conveys is also in text
- Result counts and status changes are announced through a polite live region
