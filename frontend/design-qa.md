# Design QA

- source visual truth path: C:/Users/86137/AppData/Local/Temp/codex-clipboard-a6a29776-f886-490e-8d35-bea9301b5b21.png
- implementation: http://127.0.0.1:4173/login and /register
- viewport: 1440 x 900 CSS px, density 1
- source dimensions: 1749 x 805 px (used as direction plus the user's explicit revision notes)
- implementation screenshot: captured in Codex in-app browser at 1440 x 900
- states: login and register

## Full-view comparison evidence

The revised implementation removes all translucent surfaces and circular background decoration. Both sides now use the same solid #f4f7fb canvas, with only a subtle center divider. Content is grouped into two bounded blocks with matching vertical edges.

## Focused comparison evidence

Focused DOM measurements were required for the paired content blocks:

- Login: left 466px, right 466.4px; top 228px vs 227.8px; bottom 694px vs 694.2px.
- Register: left 642px, right 642px; top 140.62px vs 140.44px; bottom 782.62px vs 782.44px.

## Fidelity surfaces

- Typography: clear SaaS hierarchy retained; left headline reduced from the prior oversized composition.
- Spacing/layout: paired blocks align within sub-pixel tolerance and remain centered with generous side whitespace.
- Colors/tokens: one solid cool-gray background, white feature/form cards, low-saturation blue accents.
- Images/assets: existing MindCraft AI logo is preserved at natural proportions; no replacement assets introduced.
- Copy/content: login copy is shorter; register reveals additional account-value copy as requested.

## Comparison history

1. Initial revised pass: login left/right heights were 410/466.4px; register 520/642px (P2 vertical mismatch).
2. First fix: calibrated state-specific left block min-heights to the measured form heights.
3. User review exposed a second P2 issue: equal outer dimensions still looked compressed because left-side children remained clustered around the center; the register pair also sat too low.
4. Second fix: changed the left block to distributed grid rows and moved both registration blocks upward by 22px.
5. User clarified that alignment must use the visible first and last content, not merely equal wrapper bounds, and requested one continuous composition without card-like feature blocks.
6. Final fix: removed feature backgrounds/borders/shadows, made all left-side sections direct children of one `space-between` composition, and measured the eyebrow and final visible row against the form card edges.
7. Final evidence: login visible top/bottom differ from the form card by only 0.26px/-0.14px; register visible top/bottom differences are 0px/0.00003px.
8. A later viewport capture exposed insufficient Logo clearance in the 642px registration layout. The registration card and matching left composition were compressed to 578px and returned to natural vertical centering.
9. Final registration evidence: form and visible left content run from about 172px to 750px, differ by about 0.1px, and leave a 93px gap below the Logo.
10. Registration differentiation pass: replaced the login-like text feature summary with a three-node account → creation → management workflow. Nodes enter sequentially, float subtly, and a restrained progress light traverses the connector. Visible top and bottom remain exactly aligned with the 578px registration card at 172px/750px.
11. Login differentiation pass: replaced its text feature row with a non-linear AI constellation—one central intelligence core connected to three offset idea, writing, and content nodes. This uses radial relationships and independent signal animations rather than the registration page's linear progression. Visible login edges remain aligned within 0.2px.
12. Login composition pass: expanded the constellation to four branches, moved it to the upper-middle region, placed supporting copy below it, and moved the headline to the final row. At 1440px the headline stays on one line and its visible bottom aligns with the login card within 0.2px; no horizontal overflow occurs.

## Findings

No actionable P0/P1/P2 findings remain. The login/register switch animates the state-keyed left content, with staggered registration details and reduced-motion support.

## Follow-up polish

- P3: Font rasterization can vary slightly by Windows display scaling.

final result: passed
