# Interview mock-ups

Neutral mock-ups used in rounds 3–8 of the taste interview. Each family changes one dimension
(theme, brand closeness, list layout, status style, deposit explanation, typeface) on the same
real content, so the owner judged that dimension only.

- `data.json`: the content. Real Address Tags entries from the Light Curate registry on Gnosis,
  read from chain/IPFS on 2026-10-17 around 18:50 UTC (statuses simplified to Registered,
  Submitted, Challenged, Appeal, Rejected/Removed; deposit 51.6 xDAI = 30 base + 21.6
  arbitration for 3 jurors; challenge period 3 days 12 hours). Not live data: re-read before reuse.
- `gen.py`: writes one HTML file per mock (`python3 gen.py`).
- `shoot.py`: screenshots them into `shots/` and trims the empty background. Set `SHOT_PY`
  to a screenshot script that accepts `<url> --width --height --scale --wait --out`.
- `shots/`: the 22 screenshots shown in the interview. The chosen ones are `theme-both`
  (round 3), `brand-independent` (round 4), `status-dot` (round 6), `deposit-steps`
  (round 7), `type-mono` (round 8). See `../interview-answers.md`.

These are references for the redesign, not production code.
