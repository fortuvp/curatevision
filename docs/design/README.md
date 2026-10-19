# Design material

| What | Where | How to open |
|---|---|---|
| Design system (tokens, type, motion kit, data rules) | [`DESIGN.md`](../../DESIGN.md) | read it |
| Taste interview: options and the owner's answers | [`interview-answers.md`](interview-answers.md) | read it |
| Interview mock-ups and their data | [`mocks/`](mocks/) | `mocks/README.md` |
| Ten dashboard alternatives, on one real data snapshot | [`dashboard-variants/`](dashboard-variants/) | serve the folder, open `index.html` |
| Standalone landing page for Curate | [`public/landing/`](../../public/landing/) | `/landing/` in production, `/landing/index.html` on the dev server |

## Dashboard alternatives

Static, unwired explorations of the home dashboard. Each one answers a different question with
its own figures, all computed in the page from `snapshot.js` (Ethereum and Gnosis, captured
18 Oct 2026 19:58 UTC from the same indexers the app uses). The gallery (`index.html`) previews
all ten at desktop and phone size.

```bash
python3 -m http.server 5180 --directory docs/design/dashboard-variants
# then open http://localhost:5180/
```

Open them through a local server rather than from disk: the previews are iframes, and the
gallery's scroll guard needs the same origin.

## Previewing themes in the app

`?cv-theme=light|dark|kleros` on any route forces a theme for that visit without saving it. The
theme menu in the app bar saves the choice (System, Light, Dark, Kleros) and the typeface pairing.
