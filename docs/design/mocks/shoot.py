"""Screenshot every mock HTML and trim the empty page background below/right of the content."""
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageChops

HERE = Path(__file__).parent
import os
# Screenshot script taking <url> --width --height --scale --wait --out; set SHOT_PY.
SHOT = os.environ["SHOT_PY"]
BG = (246, 247, 249)
names = sys.argv[1:] or [p.stem for p in sorted(HERE.glob("*.html"))]
procs = []
for n in names:
    procs.append(subprocess.Popen([sys.executable, SHOT, f"file://{HERE / (n + '.html')}", "--width", "1272", "--height", "900",
                                   "--scale", "2", "--wait", "3000", "--out", str(HERE / "shots" / f"{n}.webp")],
                                  stdout=subprocess.DEVNULL))
    if len(procs) >= 4:
        procs.pop(0).wait()
for p in procs:
    p.wait()
for n in names:
    f = HERE / "shots" / f"{n}.webp"
    im = Image.open(f).convert("RGB")
    bg = im.getpixel((im.width - 2, im.height - 2))
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L").point(lambda v: 255 if v > 14 else 0)
    box = diff.getbbox()
    if box:
        pad = 56
        im = im.crop((0, 0, im.width, min(im.height, box[3] + pad)))
    im.save(f, "WEBP", quality=88, method=6)
    print(n, im.size)
