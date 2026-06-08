"""Process the generated app-icon art into the assets the launchers use.

Trims the surrounding white background, centers the icon on a transparent
square canvas, then writes:
  - assets/AppIcon.png  (1024x1024 master, committed; macOS install builds .icns from it)
  - scripts/AppIcon.ico (multi-size Windows icon, used by the desktop shortcut)
"""
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "assets/AppIcon.png"

img = Image.open(SRC).convert("RGBA")

# Treat near-white pixels as background and trim them off.
px = img.load()
w, h = img.size


def is_bg(p):
    r, g, b, a = p
    return a < 8 or (r > 244 and g > 244 and b > 244)


left, top, right, bottom = w, h, 0, 0
for y in range(h):
    for x in range(w):
        if not is_bg(px[x, y]):
            left = min(left, x)
            right = max(right, x)
            top = min(top, y)
            bottom = max(bottom, y)

if right <= left or bottom <= top:
    left, top, right, bottom = 0, 0, w - 1, h - 1

cropped = img.crop((left, top, right + 1, bottom + 1))

# Center on a square transparent canvas with a little breathing room.
side = max(cropped.size)
pad = int(side * 0.06)
canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
ox = (canvas.size[0] - cropped.size[0]) // 2
oy = (canvas.size[1] - cropped.size[1]) // 2
canvas.paste(cropped, (ox, oy), cropped)

master = canvas.resize((1024, 1024), Image.LANCZOS)
master.save("assets/AppIcon.png")
print("wrote assets/AppIcon.png", master.size)

ico_sizes = [16, 24, 32, 48, 64, 128, 256]
master.save("scripts/AppIcon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes])
print("wrote scripts/AppIcon.ico", ico_sizes)
