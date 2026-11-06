"""Paints a realistic top-down padel turf: blue artificial grass, sand infill, wear, seams, lines.

Court 20 m x 10 m at 80 px/m -> 1600 x 800. Output: JPEG for the website.
"""
import sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PX = 72
Wm, Hm = 20.0, 10.0
W, H = int(Wm * PX), int(Hm * PX)
rng = np.random.default_rng(7)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
xm, ym = xx / PX, yy / PX  # metres


def blur(a, sx, sy=None):
    sy = sx if sy is None else sy
    return cv2.GaussianBlur(a, (0, 0), sigmaX=sx, sigmaY=sy)


def noise(scale_px, amp=1.0, aniso=None):
    n = rng.standard_normal((H, W)).astype(np.float32)
    if aniso:
        n = blur(n, aniso[0], aniso[1])
    else:
        n = blur(n, scale_px)
    n /= n.std() + 1e-6
    return n * amp


def ellipse(cx, cy, rx, ry):
    d = ((xm - cx) / rx) ** 2 + ((ym - cy) / ry) ** 2
    return np.clip(1 - d, 0, 1) ** 1.5


# ---------- Base turf: padel blue, with large mottling, fibres and grain ----------
base = np.array([33, 86, 178], np.float32)  # RGB
img = np.ones((H, W, 3), np.float32) * base

mottle = noise(60) * 0.025 + noise(18) * 0.02
fibres = noise(0, 0.06, aniso=(0.6, 2.2))  # short streaks along the pile
fibres2 = noise(0, 0.035, aniso=(2.0, 0.6))
grain = rng.standard_normal((H, W)).astype(np.float32) * 0.045
shade = 1 + mottle + fibres + fibres2 + grain
img *= shade[..., None]

# Turf is laid in 4 m rolls: two faint seams along the court, slightly wavy.
for sy in (3.0, 7.0):
    wav = sy + 0.02 * np.sin(xm * 0.9) + 0.01 * np.sin(xm * 3.1)
    d = np.abs(ym - wav)
    seam = np.exp(-(d * PX / 1.1) ** 2)
    img *= (1 - 0.13 * seam)[..., None]
    img += (np.exp(-((d * PX - 2.2) / 1.0) ** 2) * 6)[..., None]  # slight lifted edge

# ---------- Wear: where players stand and run, the pile is flattened and dusty ----------
wear = np.zeros((H, W), np.float32)
for side in (0, 1):
    def X(d):  # d metres from that side's back wall
        return d if side == 0 else Wm - d
    for cy in (2.6, 7.4):
        wear += 0.9 * ellipse(X(2.3), cy, 1.9, 1.7)      # defending spots
        wear += 0.6 * ellipse(X(7.6), cy, 1.4, 1.5)      # at the net
        wear += 0.35 * ellipse(X(5.0), cy, 2.2, 1.4)     # moving between
    wear += 0.7 * ellipse(X(2.2), 3.3, 0.9, 0.7)         # serve spots
    wear += 0.7 * ellipse(X(2.2), 6.7, 0.9, 0.7)
    wear += 0.45 * ellipse(X(3.05), 5.0, 1.0, 1.2)       # the T
irreg = blur(rng.standard_normal((H, W)).astype(np.float32), 22)
irreg = (irreg - irreg.min()) / (irreg.max() - irreg.min())
wear = np.clip(wear * (0.55 + 0.9 * irreg), 0, 1)
worn_tint = np.array([96, 128, 188], np.float32)
img = img * (1 - 0.32 * wear[..., None]) + worn_tint * (0.32 * wear[..., None])

# ---------- Sand infill ----------
# Sand drifts against the walls and into the corners, and comes up where the turf is worn.
edge_d = np.minimum.reduce([xm, Wm - xm, ym, Hm - ym])
back_d = np.minimum(xm, Wm - xm)
corner = np.minimum(np.hypot(xm, ym), np.minimum(np.hypot(Wm - xm, ym), np.minimum(np.hypot(xm, Hm - ym), np.hypot(Wm - xm, Hm - ym))))
sand_density = (
    0.035
    + 0.55 * np.exp(-back_d / 0.35)
    + 0.30 * np.exp(-edge_d / 0.30)
    + 0.45 * np.exp(-corner / 0.9)
    + 0.38 * wear
)
drift = blur(rng.standard_normal((H, W)).astype(np.float32), 9)
drift = (drift - drift.min()) / (drift.max() - drift.min())
sand_density = np.clip(sand_density * (0.6 + 0.8 * drift), 0, 1)

sand_col = np.array([212, 194, 152], np.float32)
# a fine dusting...
haze = blur(sand_density, 1.2) * 0.30
img = img * (1 - haze[..., None]) + sand_col * haze[..., None]
# ...and individual grains and small clusters
r = rng.random((H, W)).astype(np.float32)
grains = (r < sand_density * 0.16).astype(np.float32)
clusters = blur((rng.random((H, W)) < sand_density * 0.012).astype(np.float32), 1.1) * 3.0
g = np.clip(grains * rng.uniform(0.35, 0.85, (H, W)).astype(np.float32) + clusters, 0, 0.9)
grain_col = sand_col[None, None, :] * (0.9 + 0.2 * rng.random((H, W, 1)).astype(np.float32))
img = img * (1 - g[..., None]) + grain_col * g[..., None]

# ---------- Lines: 5 cm white tape, a bit dusty ----------
lines = np.zeros((H, W), np.float32)
lw = 0.05
svc = 6.95
def band_x(x0, y0, y1):
    return ((np.abs(xm - x0) <= lw / 2) & (ym >= y0) & (ym <= y1)).astype(np.float32)
def band_y(y0, x0, x1):
    return ((np.abs(ym - y0) <= lw / 2) & (xm >= x0) & (xm <= x1)).astype(np.float32)
lines += band_x(10 - svc, 0, Hm) + band_x(10 + svc, 0, Hm)
lines += band_y(5.0, 10 - svc - 0.2, 10 + svc + 0.2)  # centre line runs 20 cm past the service lines
lines = np.clip(blur(lines, 0.7), 0, 1)
line_wear = np.clip(1 - 0.35 * blur(rng.random((H, W)).astype(np.float32), 0.8) - 0.25 * sand_density, 0.45, 1)
line_col = np.array([238, 240, 242], np.float32)
la = lines * line_wear * 0.95
img = img * (1 - la[..., None]) + line_col * la[..., None]

# ---------- Painted club logo behind each service line (faded) ----------
logo = Image.new("L", (W, H), 0)
font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 41)
for side in (0, 1):
    tile = Image.new("L", (470, 80), 0)
    d = ImageDraw.Draw(tile)
    d.text((235, 40), "GO PADEL", font=font, fill=255, anchor="mm")
    tile = tile.rotate(90 if side == 0 else -90, expand=True)
    cx = int((1.55 if side == 0 else Wm - 1.55) * PX)
    logo.paste(tile, (cx - tile.width // 2, H // 2 - tile.height // 2), tile)
la = np.asarray(logo, np.float32) / 255 * 0.16 * line_wear
img = img * (1 - la[..., None]) + line_col * la[..., None]

# ---------- Light: floodlight pools at the corners, a little darker mid-court; dark edges by the walls ----------
light = np.zeros((H, W), np.float32)
for (lx, ly) in ((-0.6, -0.6), (Wm + 0.6, -0.6), (-0.6, Hm + 0.6), (Wm + 0.6, Hm + 0.6)):
    light += np.exp(-(((xm - lx) / 7.5) ** 2 + ((ym - ly) / 6.5) ** 2))
light = light / light.max()
img *= (0.86 + 0.24 * light)[..., None]
ao = 1 - 0.32 * np.exp(-edge_d / 0.22) - 0.12 * np.exp(-edge_d / 0.8)
img *= ao[..., None]

img = np.clip(img, 0, 255).astype(np.uint8)
Image.fromarray(img, "RGB").save(OUT, quality=80, optimize=True, progressive=True)
print("saved", OUT, img.shape)
