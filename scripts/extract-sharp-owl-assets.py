"""Extract sharp guardian owl crops from brand/heroes/auth-hero-dual.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public"
SRC = ROOT / "brand" / "heroes" / "auth-hero-dual.png"

# Measured against the comp — center column only; excludes left headline column.
SHARP_OWL_CROP = {
    "left_pct": 0.40,
    "top_pct": 0.04,
    "width_pct": 0.26,
    "height_pct": 0.86,
}


def crop_owl(
    img: Image.Image,
    *,
    left_pct: float,
    top_pct: float,
    width_pct: float,
    height_pct: float,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    width, height = img.size
    box = (
        int(width * left_pct),
        int(height * top_pct),
        int(width * (left_pct + width_pct)),
        int(height * (top_pct + height_pct)),
    )
    return img.crop(box), box


def main() -> None:
    source = Image.open(SRC).convert("RGBA")
    width, height = source.size
    midpoint = height // 2

    dark_sheet = source.crop((0, 0, width, midpoint))
    light_sheet = source.crop((0, midpoint, width, height))

    owls_dir = ROOT / "brand" / "owls"
    owls_dir.mkdir(parents=True, exist_ok=True)

    for name, sheet in (("dark", dark_sheet), ("light", light_sheet)):
        owl, box = crop_owl(sheet, **SHARP_OWL_CROP)
        out = owls_dir / f"guardian-sharp-{name}.png"
        owl.save(out, optimize=True)
        print(f"{name}: box={box} size={owl.size} -> {out.relative_to(ROOT.parent)}")

    guardian = owls_dir / "guardian-sharp-full.png"
    guardian.write_bytes((owls_dir / "guardian-sharp-dark.png").read_bytes())
    print(f"guardian alias -> {guardian.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
