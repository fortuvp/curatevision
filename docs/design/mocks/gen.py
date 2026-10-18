"""Generate neutral GTCR mini-mocks for the taste interview.

Each family varies ONE dimension (layout, status language, deposit moment, type, theme, brand)
and keeps everything else identical, so the user judges that dimension only.
Content is real Address Tags data (see data.json "_source").
Run: python3 gen.py  → writes *.html next to this file.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
DATA = json.loads((HERE / "data.json").read_text())
REG = DATA["registry"]

NEUTRAL_LIGHT = """--bg:#f6f7f9; --surface:#ffffff; --surface2:#fafbfc; --ink:#101318; --muted:#5d6570; --faint:#8a929c; --rule:#e3e6ea;
  --btn:#101318; --btntext:#ffffff; --ok:#1f8a4c; --okbg:#e7f5ec; --wait:#2b6cb0; --waitbg:#e8f1fb; --warn:#b4570b; --warnbg:#fdf0e3;
  --bad:#c0362c; --badbg:#fbe9e7; --neutralbg:#eef0f3;"""
NEUTRAL_DARK = """--bg:#0f1114; --surface:#171a1f; --surface2:#1c2026; --ink:#e8eaed; --muted:#a0a8b3; --faint:#717a86; --rule:#2a2f36;
  --btn:#e8eaed; --btntext:#0f1114; --ok:#4cc38a; --okbg:#173326; --wait:#6aa7f0; --waitbg:#172a42; --warn:#f0a657; --warnbg:#3a2814;
  --bad:#ff7a6e; --badbg:#3d1c19; --neutralbg:#252a31;"""
# Kleros production dApp tokens (ui-components-library v3.10.0), dark set: deep purple surfaces,
# purple for identity, blue for action.
KLEROS_DARK = """--bg:#1B003F; --surface:#220050; --surface2:#2A1260; --ink:#DAF0FF; --muted:#BECCE5; --faint:#8f86b8; --rule:#392C74;
  --btn:#6CC5FF; --btntext:#1B003F; --ok:#65DC7F; --okbg:#173d2c; --wait:#6CC5FF; --waitbg:#2E206C; --warn:#FFC46B; --warnbg:#3f2a3a;
  --bad:#FF5A78; --badbg:#3f1240; --neutralbg:#2E206C;"""
# Neutral light with Kleros purple for identity (header, title) and Kleros blue for action.
KLEROS_ACCENT = NEUTRAL_LIGHT + """ --btn:#4D00B4; --btntext:#ffffff; --identity:#4D00B4;"""
# Independent: monochrome; color appears only in statuses.
INDEPENDENT = """--bg:#f3f2ef; --surface:#fbfaf8; --surface2:#f3f2ef; --ink:#151515; --muted:#5e5b55; --faint:#8b877f; --rule:#dedbd4;
  --btn:#151515; --btntext:#fbfaf8; --ok:#2f7d4f; --okbg:#e3efe6; --wait:#3a5f9e; --waitbg:#e5ebf5; --warn:#a85a12; --warnbg:#f5e9dc;
  --bad:#b33a2e; --badbg:#f6e3e0; --neutralbg:#e9e7e2;"""

BASE_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root { __VARS__ --sans:'Inter', system-ui, sans-serif; --mono:'JetBrains Mono', ui-monospace, monospace; }
* { box-sizing:border-box; } html,body { margin:0; background:var(--bg); }
body { color:var(--ink); font:400 14px/1.45 var(--sans); padding:28px 36px; }
h1 { font:650 24px/1.2 var(--sans); margin:0; letter-spacing:-0.01em; }
.sub { color:var(--muted); margin:4px 0 0; }
.mono { font-family:var(--mono); font-size:12.5px; }
.muted { color:var(--muted); } .faint { color:var(--faint); }
.head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:18px; }
.btn { font:600 13px/1 var(--sans); padding:10px 14px; border-radius:8px; border:1px solid var(--btn); background:var(--btn); color:var(--btntext); white-space:nowrap; }
.logo { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font:700 11px var(--sans); color:#fff; flex:none; }
.chain { display:inline-block; font:500 11px/1 var(--sans); padding:3px 6px; border-radius:4px; background:var(--neutralbg); color:var(--muted); margin-right:6px; }
"""

LOGO_COLORS = {"OpenSea": "#2081e2", "Polygon FastLane": "#7b3fe4", "cattlerancher": "#8a6a3b", "Wasabi": "#4f9d4a",
               "ADAO": "#3d6ad6", "Axiom": "#2b2b2b", "LOL": "#d6457a",
               "Ministry of Post and Telecommunications, Cambodia": "#c2382f"}


def logo(name):
    return f'<span class="logo" style="background:{LOGO_COLORS.get(name, "#59616c")}">{name[:1].upper()}</span>'


def page(title, css, body, vars_=NEUTRAL_LIGHT, width=1200):
    return (f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title>"
            f"<style>{BASE_CSS.replace('__VARS__', vars_)}{css}</style></head><body style='width:{width}px'>{body}</body></html>")


def registry_head(title_style=""):
    return (f"<div class='head'><div><h1 style='{title_style}'>{REG['name']}</h1><p class='sub'>{REG['description']}</p>"
            f"<p class='faint' style='margin:6px 0 0;font-size:13px'>{REG['counts']}</p></div>"
            f"<div><span class='btn'>Submit tag</span></div></div>")


ITEMS = DATA["items"]


def contract(it):
    return f"<span class='chain'>{it['chain']}</span><span class='mono muted'>{it['address_short']}</span>"


# ---------------------------------------------------------------- layout family
def layout_table():
    css = """
table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--rule); border-radius:10px; overflow:hidden; }
th { text-align:left; font:500 11.5px/1 var(--sans); text-transform:uppercase; letter-spacing:.04em; color:var(--faint); padding:12px 14px; border-bottom:1px solid var(--rule); background:var(--surface2); }
td { padding:11px 14px; border-bottom:1px solid var(--rule); vertical-align:middle; }
tr:last-child td { border-bottom:0; }
.n { display:flex; align-items:center; gap:10px; } .t { font-weight:600; } .p { color:var(--muted); font-size:13px; }
"""
    rows = "".join(
        f"<tr><td><div class='n'>{logo(it['project'])}<div><div class='t'>{it['tag']}</div><div class='p'>{it['project']}</div></div></div></td>"
        f"<td>{contract(it)}</td><td class='muted'>{it['domain']}</td><td>{it['state_text']}</td></tr>"
        for it in ITEMS[:8])
    body = registry_head() + (f"<table><thead><tr><th>Tag</th><th>Contract</th><th>Website</th>"
                              f"<th>Status</th></tr></thead><tbody>{rows}</tbody></table>")
    return page("Layout: table", css, body)


def layout_cards():
    css = """
.grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:14px; }
.card { background:var(--surface); border:1px solid var(--rule); border-radius:12px; padding:16px; display:grid; gap:9px; align-content:start; }
.t { font-weight:600; font-size:15px; line-height:1.3; } .p { color:var(--muted); font-size:13px; margin-top:-5px; }
.logo { width:40px; height:40px; font-size:15px; } .st { font-size:13px; padding-top:9px; border-top:1px solid var(--rule); }
"""
    cards = "".join(
        f"<div class='card'>{logo(it['project'])}<div class='t'>{it['tag']}</div><div class='p'>{it['project']}</div>"
        f"<div>{contract(it)}</div><div class='st'>{it['state_text']}</div></div>"
        for it in ITEMS[:8])
    return page("Layout: cards", css, registry_head() + f"<div class='grid'>{cards}</div>")


def layout_rows():
    css = """
.list { display:grid; gap:8px; }
.row { background:var(--surface); border:1px solid var(--rule); border-radius:12px; padding:14px 16px; display:grid;
  grid-template-columns: 40px 1fr 230px 200px; align-items:center; gap:14px; }
.logo { width:36px; height:36px; font-size:14px; }
.t { font-weight:600; font-size:15px; } .meta { color:var(--muted); font-size:13px; margin-top:2px; }
"""
    rows = "".join(
        f"<div class='row'>{logo(it['project'])}<div><div class='t'>{it['tag']}</div>"
        f"<div class='meta'>{it['project']}{' · ' + it['domain'] if it['domain'] != '—' else ''}</div></div>"
        f"<div>{contract(it)}</div><div style='font-size:13.5px'>{it['state_text']}</div></div>"
        for it in ITEMS[:7])
    return page("Layout: rows", css, registry_head() + f"<div class='list'>{rows}</div>")


# ---------------------------------------------------------------- status family
TONE = {"Registered": "ok", "Submitted": "wait", "Challenged": "warn", "Appeal": "warn", "Rejected": "bad", "Removed": "bad"}
STATUS_ROWS = DATA["status_rows"]

STATUS_CSS = """
.list { background:var(--surface); border:1px solid var(--rule); border-radius:12px; }
.row { display:grid; grid-template-columns: 36px 1fr 1.3fr; gap:14px; align-items:center; padding:14px 18px; border-bottom:1px solid var(--rule); }
.row:last-child { border-bottom:0; }
.t { font-weight:600; } .meta { color:var(--muted); font-size:13px; }
"""


def status_list(cell, vars_=NEUTRAL_LIGHT, title="Status", head_style=""):
    rows = "".join(
        f"<div class='row'>{logo(r['project'])}<div><div class='t'>{r['tag']}</div>"
        f"<div class='meta'><span class='chain'>{r['chain']}</span><span class='mono'>{r['address_short']}</span></div></div>"
        f"<div>{cell(r)}</div></div>"
        for r in STATUS_ROWS)
    return page(title, STATUS_CSS, registry_head(head_style) + f"<div class='list'>{rows}</div>", vars_)


def cell_dot(r):
    tone = TONE[r["status"]]
    return (f"<span style='display:inline-flex;align-items:center;gap:8px;font-weight:500'>"
            f"<span style='width:8px;height:8px;border-radius:50%;background:var(--{tone})'></span>{r['status']}</span>"
            f"<span class='faint' style='margin-left:10px;font-size:13px'>{r['detail_short']}</span>")


def cell_pill(r):
    tone = TONE[r["status"]]
    return (f"<span style='display:inline-block;padding:5px 10px;border-radius:999px;font:600 12px var(--sans);"
            f"background:var(--{tone}bg);color:var(--{tone})'>{r['status']}</span>"
            f"<span class='faint' style='margin-left:10px;font-size:13px'>{r['detail_short']}</span>")


def cell_rail(r):
    tone = TONE[r["status"]]
    pct = r.get("progress")
    bar = (f"<div style='height:4px;border-radius:2px;background:var(--neutralbg);margin-top:7px'>"
           f"<div style='height:4px;border-radius:2px;width:{pct}%;background:var(--{tone})'></div></div>"
           if pct is not None else "<div style='height:4px;margin-top:7px'></div>")
    return (f"<div style='display:flex;justify-content:space-between;font-size:13px'>"
            f"<span style='font-weight:600;color:var(--{tone})'>{r['status']}</span>"
            f"<span class='muted mono'>{r['countdown']}</span></div>{bar}")


def cell_sentence(r):
    tone = TONE[r["status"]]
    return (f"<div style='display:flex;gap:10px'>"
            f"<span style='width:3px;flex:none;border-radius:2px;background:var(--{tone})'></span>"
            f"<span style='font-size:14px'>{r['sentence']}</span></div>")


# ---------------------------------------------------------------- deposit family
D = DATA["deposit"]

DEP_CSS = """
.wrap { display:grid; grid-template-columns: 1fr 390px; gap:24px; align-items:start; }
.panel { background:var(--surface); border:1px solid var(--rule); border-radius:14px; padding:22px; }
.form { display:grid; gap:14px; }
.field label { display:block; font:500 12.5px var(--sans); color:var(--muted); margin-bottom:6px; }
.input { border:1px solid var(--rule); border-radius:8px; padding:11px 12px; background:var(--surface); }
h2 { font:650 17px/1.3 var(--sans); margin:0 0 4px; }
.line { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px dashed var(--rule); }
.total { display:flex; justify-content:space-between; padding-top:12px; font-weight:650; font-size:16px; }
.note { font-size:13px; color:var(--muted); margin-top:10px; }
.btn.full { display:block; text-align:center; width:100%; margin-top:16px; padding:13px; }
"""


def _form():
    return f"""
<div class='form'>
  <div class='field'><label>Contract address</label><div class='input'><span class='chain'>{D['chain']}</span><span class='mono'>{D['address']}</span></div></div>
  <div class='field'><label>Public name tag</label><div class='input'>{D['tag']}</div></div>
  <div class='field'><label>Project name</label><div class='input'>{D['project']}</div></div>
</div>"""


def _title():
    return f"<h1>Submit a tag to {REG['name']}</h1><p class='sub'>{REG['description']}</p><br>"


def deposit_inline():
    body = f"""{_title()}<div class='panel' style='max-width:720px'>{_form()}
<p style='margin:18px 0 0;padding:12px 14px;border-radius:8px;background:var(--neutralbg);font-size:14px;line-height:1.5'>
You'll lock <b>{D['total']}</b>. If nobody challenges within {D['challenge_period']}, you get it all back.
<span class='muted'>If someone challenges and jurors rule against you, it goes to the challenger.</span></p>
<span class='btn full'>Submit and deposit {D['total']}</span></div>"""
    return page("Deposit: inline", DEP_CSS, body)


def deposit_receipt():
    lines = "".join(f"<div class='line'><span class='muted'>{k}</span><span class='mono'>{v}</span></div>" for k, v in D["breakdown"])
    body = f"""{_title()}<div class='wrap'><div class='panel'>{_form()}</div>
<div class='panel'><h2>Deposit</h2><p class='note' style='margin-top:0'>Held by the registry contract on {REG['chain']}</p>{lines}
<div class='total'><span>Total</span><span class='mono'>{D['total']}</span></div>
<p class='note'>≈ {D['total_fiat']} · Back to you after {D['challenge_period']} if nobody challenges.</p>
<span class='btn full'>Submit</span></div></div>"""
    return page("Deposit: receipt", DEP_CSS, body)


def deposit_steps():
    steps = [("1", "You deposit " + D["total"], "It's held by the registry contract, not paid as a fee."),
             ("2", f"{D['challenge_period']} challenge window", "Anyone can challenge your tag by paying the arbitration cost."),
             ("3a", "Nobody challenges", "Your tag is added and the full deposit comes back."),
             ("3b", "Someone challenges", "Kleros jurors decide. If they rule for you, your deposit comes back. If not, it goes to the challenger.")]
    st = "".join(f"<div style='display:grid;grid-template-columns:34px 1fr;gap:12px;padding:9px 0'>"
                 f"<span style='width:28px;height:28px;border-radius:50%;border:1.5px solid var(--ink);display:grid;place-items:center;font:600 11.5px var(--sans)'>{n}</span>"
                 f"<div><div style='font-weight:600'>{t}</div><div class='muted' style='font-size:13px'>{d}</div></div></div>" for n, t, d in steps)
    body = f"""{_title()}<div class='wrap'><div class='panel'>{_form()}</div>
<div class='panel'><h2>What happens next</h2>{st}<span class='btn full'>I understand, deposit {D['total']}</span></div></div>"""
    return page("Deposit: steps", DEP_CSS, body)


# ---------------------------------------------------------------- type family
def type_specimen(pair):
    css = f"""
@import url('{pair['import']}');
body {{ font-family:{pair['body']}; padding:40px 48px; }}
.d {{ font-family:{pair['display']}; font-weight:{pair.get('display_weight', 650)}; font-size:46px; line-height:1.05; letter-spacing:{pair.get('tracking', '-0.02em')}; margin:0; }}
.lead {{ font-size:17px; color:var(--muted); max-width:58ch; margin:12px 0 26px; }}
.row {{ display:grid; grid-template-columns: 1.5fr 0.9fr 1fr; gap:16px; background:var(--surface); border:1px solid var(--rule); border-radius:12px; padding:15px 18px; align-items:center; margin-bottom:8px; }}
.t {{ font-weight:600; font-size:16px; }} .num {{ font-family:{pair['numbers']}; font-variant-numeric:tabular-nums; font-size:15px; }}
.lab {{ font-size:12px; color:var(--faint); text-transform:uppercase; letter-spacing:.05em; }}
"""
    rows = "".join(
        f"<div class='row'><div><div class='t'>{r['tag']}</div><div class='num muted' style='font-size:13px'>{r['chain']} · {r['address_short']}</div></div>"
        f"<div><div class='lab'>Deposit</div><div class='num'>{r['deposit']}</div></div>"
        f"<div><div class='lab'>Status</div><div class='num'>{r['status']} · {r['countdown']}</div></div></div>"
        for r in STATUS_ROWS[1:4])
    body = (f"<p class='lab' style='margin:0 0 10px'>{pair['label']}</p><h1 class='d'>{REG['name']}</h1>"
            f"<p class='lead'>{REG['description']}</p>{rows}")
    return page(f"Type: {pair['label']}", css, body)


def main():
    out = {
        "layout-table": layout_table(), "layout-cards": layout_cards(), "layout-rows": layout_rows(),
        "status-dot": status_list(cell_dot), "status-pill": status_list(cell_pill),
        "status-rail": status_list(cell_rail), "status-sentence": status_list(cell_sentence),
        "deposit-inline": deposit_inline(), "deposit-receipt": deposit_receipt(), "deposit-steps": deposit_steps(),
        "theme-light": status_list(cell_pill, NEUTRAL_LIGHT, "Theme: light"),
        "theme-dark": status_list(cell_pill, NEUTRAL_DARK, "Theme: dark"),
        "brand-kleros": status_list(cell_pill, KLEROS_DARK, "Brand: Kleros-native"),
        "brand-accent": status_list(cell_pill, KLEROS_ACCENT, "Brand: accent", "color:var(--identity)"),
        "brand-independent": status_list(cell_pill, INDEPENDENT, "Brand: independent"),
    }
    for p in DATA["type_pairs"]:
        out[f"type-{p['id']}"] = type_specimen(p)
    for name, html in out.items():
        (HERE / f"{name}.html").write_text(html)
    print(" ".join(out))


if __name__ == "__main__":
    main()
