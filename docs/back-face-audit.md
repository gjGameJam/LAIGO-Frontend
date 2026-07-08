# Back-face pieces — audit findings (2026-07-07)

Audit of the back-face hardware feature added to `src/components/MosaicScene.tsx`
(grey support plates, green/red seam connectors + pins, baseplate seam lines, and
rewritten wall hooks). Scope is that change only.

**Status:** none of these are critical. The feature is functionally correct and
verified end-to-end (2×2 and 1×1 baseplate mosaics, no runtime errors). This doc is
a backlog to tackle later — nothing here blocks shipping.

Severity key: **Low–Med** worth doing · **Low** nice-to-have · **Cosmetic** optional ·
**By design / Simplification / Approximation / Judgment** = intentional deviation, documented for the record.

---

## 1. Inaccuracies (render vs. backend truth)

Confirmed **accurate** against `MosiacToOrder.py` / `VisualMaker.py` / `piece_specs.py`:
piece counts (`5·bw·bh` grey, `(bw−1)·bh` green, `(bh−1)·bw` red, `min(bw·bh,2)` hooks),
colors (`#707070` / `#A5CA17` / `#CC1A1A` / `#4D4D4D` / `#1F1F1F`), grey-plate corner+center
positions, bridge-plate sizes/orientations, pin seam offsets (Z 3.9/12.9, X 2.15/11.15).

Deviations:

| # | Severity | Finding |
|---|----------|---------|
| I-1 | By design | **Pin depth is physically wrong for visibility.** Real connector pins sit at mid-baseplate height (`−PLATE_H/2 = −0.2`, in the side-holes). Rendered at `BACK_Y = −0.6` because at −0.2 they're buried inside the solid slab and invisible (no real seam gap exists). Deliberate accuracy-for-visibility trade; commented at the `PIN_Y` constant. |
| I-2 | Simplification | **Baseplate is one slab + painted seam lines, not `bw×bh` discrete 16×16 baseplates.** Connectors bridge a drawn line, not a real gap. Reads correctly; not geometrically literal. |
| I-3 | Approximation | **Wall hook is a stylized bracket + catch + 2 pins,** not a faithful model of LEGO part 6302094. |
| I-4 | Minor | **`blockWidth==1`, multi-row hook X is symmetric ±0.2·W;** backend uses 0.30/0.70 from the baseplate's left edge, asymmetric about true center by ~0.5 stud. Rare tall-narrow case only. |
| I-5 | Judgment | **`HOOK_INSET_Z = 1.5` studs** is an interpretation of the backend's qualitative "just below the top edge." No exact backend value to match. |

## 2. Anti-practices (code quality)

| # | Severity | Finding | Suggested fix |
|---|----------|---------|---------------|
| A-1 | **Low–Med** | Back pieces derive centering + loop bounds from the `width_studs` / `block_width` scalars, while the studs (`useStudGroups`) derive from the actual `background_grid` array dimensions. Per contract they agree, but they're independent fields — a desynced/malformed response would misalign back pieces vs. studs, and `bw/bh` from a bad scalar makes the piece loops **unbounded**. | Compute `cols/rows` from `background_grid` and `bw/bh` from those, exactly like `useStudGroups`. One change; also closes S-1. |
| A-2 | Low | Centering formula `−(dim−1)/2` is duplicated in 4 functions (`useStudGroups`, `useBackPieces`, `BaseplateSeams`, `computeHookXs`). | Extract one shared helper so it can't drift. |
| A-3 | Low | Inline geometry magic numbers remain in `SingleHook` (bracket `0.15/1.0`, catch `1.2/0.7/0.15`, pin `0.18/0.25/0.32`) and `BaseplateSeams` (`0.12/0.06/0.03`). | Promote to named constants. |
| A-4 | Cosmetic | `BackPieces` wraps already-cached geometry getters in `useMemo` (redundant, but matches the file's idiom); `BaseplateSeams` rebuilds its arrays each render (un-memoized). | Negligible — leave unless touching the file anyway. |

**Good practices upheld:** instancing keeps draw calls flat (5 regardless of mosaic size);
the `count===0 → null` return sits *after* the `useEffect`, so Rules of Hooks hold; geometries
are module-cached and shared; `count` is baked into `args` so buffers resize correctly on data change.

## 3. Security

**No new attack surface.** Pure client-side geometry computed from already-fetched, typed,
backend-supplied `PreviewData` — no network calls, no user-input handling, no DOM/HTML injection,
no `eval`/dynamic code, no secrets.

| # | Severity | Finding | Suggested fix |
|---|----------|---------|---------------|
| S-1 | Low | Client-side unbounded iteration on untrusted numeric fields (same root as A-1). A malformed/malicious backend sending a huge `block_width`/`block_height` would allocate enormous position arrays → browser OOM. Client-only, self-inflicted, backend is trusted — but the stud loop is bounded by the grid array length while these loops are bounded only by scalars. | Derive loop bounds from `background_grid` dimensions (same fix as A-1). |

---

## Recommended if/when revisited

**A-1 / S-1** is the one worth doing — derive `cols/rows/bw/bh` from `background_grid` instead
of the scalar fields. Small, low-risk, and fixes both the consistency gap and the DoS note at once.
**A-2** (extract the centering helper) pairs naturally with it. Everything else is a documented
trade-off or cosmetic.
