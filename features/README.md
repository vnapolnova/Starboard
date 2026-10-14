# Features

One folder per feature, named after its GitHub issue: `NNN-short-slug/` (for example `014-morning-greeting/`).

| File | Written in | Stage |
|---|---|---|
| `brief.md` | Cowork or `/brief` | Brief |
| `mockup-tablet.html`, `mockup-phone.html` | `/mockup` | Mockup (owner gate) |
| `plan.md` | `/plan` | Plan |

Start from `_template/`. Mockups start as copies of `design/*-mockup.html`; keep them self-contained (no build step) so they open straight from the preview URL.

Status lives on the issue, not here. See `docs/pipeline.md`.
