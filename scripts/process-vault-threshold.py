from pathlib import Path

from PIL import Image

src = Path(
    r"C:\Users\dlbja\.cursor\projects\c-JackProject-afenda-bolt-client-declaration-portal\assets\vault-threshold.png"
)
dests = [
    Path(r"c:\JackProject\afenda-bolt\client-declaration-portal\public\assets\vault-threshold.png"),
    Path(r"c:\JackProject\afenda-bolt\client-declaration-portal\public\fade-owl\vault-threshold.png"),
]

im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size


def is_plate_white(r: int, g: int, b: int) -> bool:
    return r > 210 and g > 210 and b > 210 and abs(r - g) < 14 and abs(g - b) < 14


def is_plate_black(r: int, g: int, b: int) -> bool:
    return r < 28 and g < 28 and b < 28


# Pass 1: white plate -> transparent
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if is_plate_white(r, g, b):
            strength = max(0, min(1, (max(r, g, b) - 210) / 45))
            pixels[x, y] = (r, g, b, int(255 * (1 - strength)))

# Pass 2: flood-fill near-black from edges so outer void becomes transparent,
# while the interior keyhole void stays black.
visited = [[False] * w for _ in range(h)]
stack: list[tuple[int, int]] = []

for x in range(w):
    stack.append((x, 0))
    stack.append((x, h - 1))
for y in range(h):
    stack.append((0, y))
    stack.append((w - 1, y))

while stack:
    x, y = stack.pop()
    if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
        continue
    visited[y][x] = True
    r, g, b, a = pixels[x, y]
    if a == 0:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                stack.append((nx, ny))
        continue
    if not is_plate_black(r, g, b):
        continue
    pixels[x, y] = (r, g, b, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
            stack.append((nx, ny))

bbox = im.getbbox()
if bbox:
    pad = 20
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    im = im.crop((left, top, right, bottom))

for dest in dests:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")
    print(dest.name, im.size, im.mode)

im.save(src, "PNG")
print("corner", im.getpixel((0, 0)))
print("center", im.getpixel((im.size[0] // 2, im.size[1] // 2)))
