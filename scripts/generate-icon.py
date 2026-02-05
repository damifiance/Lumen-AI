#!/usr/bin/env python3
"""Generate Lumen AI app icon — a stylized sun on a warm gradient background."""

import math
import os
import subprocess
import sys

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Pillow not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
CENTER = SIZE // 2
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
BUILD_DIR = os.path.join(PROJECT_DIR, "electron", "build")


def lerp_color(c1, c2, t):
    """Linearly interpolate between two RGB tuples."""
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_gradient_background(img):
    """Draw a warm golden-to-deep-amber gradient background with rounded corners."""
    draw = ImageDraw.Draw(img)
    top_color = (251, 191, 36)     # golden-amber
    bottom_color = (180, 83, 9)    # deep amber/brown

    for y in range(SIZE):
        t = y / SIZE
        color = lerp_color(top_color, bottom_color, t)
        draw.line([(0, y), (SIZE, y)], fill=color)

    # Rounded corner mask
    mask = Image.new("L", (SIZE, SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    radius = SIZE // 5
    mask_draw.rounded_rectangle([0, 0, SIZE, SIZE], radius=radius, fill=255)

    bg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    bg.paste(img, mask=mask)
    return bg


def draw_sun(img):
    """Draw a white sun circle with radiating rays."""
    draw = ImageDraw.Draw(img)

    # --- Outer glow ---
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_radius = 200
    glow_draw.ellipse(
        [CENTER - glow_radius, CENTER - glow_radius,
         CENTER + glow_radius, CENTER + glow_radius],
        fill=(255, 255, 255, 60),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=60))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # --- Rays ---
    num_rays = 12
    ray_inner = 155
    ray_outer = 320
    ray_half_angle = math.radians(8)
    ray_color = (255, 251, 235, 200)  # warm white, slightly transparent

    for i in range(num_rays):
        angle = math.radians(i * (360 / num_rays)) - math.pi / 2
        # Triangle: two points at inner radius, one at outer
        left_angle = angle - ray_half_angle
        right_angle = angle + ray_half_angle

        p1 = (CENTER + ray_inner * math.cos(left_angle),
              CENTER + ray_inner * math.sin(left_angle))
        p2 = (CENTER + ray_inner * math.cos(right_angle),
              CENTER + ray_inner * math.sin(right_angle))
        p3 = (CENTER + ray_outer * math.cos(angle),
              CENTER + ray_outer * math.sin(angle))

        draw.polygon([p1, p2, p3], fill=ray_color)

    # --- Sun circle ---
    sun_radius = 130
    # Slight shadow behind the circle
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(
        [CENTER - sun_radius + 4, CENTER - sun_radius + 4,
         CENTER + sun_radius + 4, CENTER + sun_radius + 4],
        fill=(0, 0, 0, 30),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    # Main sun circle — warm white
    draw.ellipse(
        [CENTER - sun_radius, CENTER - sun_radius,
         CENTER + sun_radius, CENTER + sun_radius],
        fill=(255, 251, 235, 255),
    )

    # Inner circle detail — subtle warm tint
    inner_r = sun_radius - 20
    draw.ellipse(
        [CENTER - inner_r, CENTER - inner_r,
         CENTER + inner_r, CENTER + inner_r],
        fill=(255, 249, 220, 255),
    )

    return img


def generate_ico(png_path, ico_path):
    """Generate .ico from PNG using Pillow."""
    img = Image.open(png_path)
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(ico_path, format="ICO", sizes=sizes)
    print(f"  -> {ico_path}")


def generate_icns(png_path, icns_path):
    """Generate .icns from PNG using macOS iconutil."""
    iconset_dir = os.path.join(BUILD_DIR, "icon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)

    img = Image.open(png_path)
    icon_sizes = [16, 32, 64, 128, 256, 512]

    for size in icon_sizes:
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(os.path.join(iconset_dir, f"icon_{size}x{size}.png"))
        # @2x variant
        size2x = size * 2
        if size2x <= 1024:
            resized2x = img.resize((size2x, size2x), Image.LANCZOS)
            resized2x.save(os.path.join(iconset_dir, f"icon_{size}x{size}@2x.png"))

    try:
        subprocess.run(
            ["iconutil", "-c", "icns", iconset_dir, "-o", icns_path],
            check=True,
        )
        print(f"  -> {icns_path}")
    except FileNotFoundError:
        print("  [SKIP] iconutil not found (not on macOS?). Skipping .icns generation.")
    finally:
        # Clean up iconset
        import shutil
        shutil.rmtree(iconset_dir, ignore_errors=True)


def main():
    os.makedirs(BUILD_DIR, exist_ok=True)

    print("Generating Lumen AI icon...")

    # Create base image
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # Draw gradient background with rounded corners
    img = draw_gradient_background(img)

    # Draw sun
    img = draw_sun(img)

    # Save PNG
    png_path = os.path.join(BUILD_DIR, "icon.png")
    img.save(png_path, "PNG")
    print(f"  -> {png_path}")

    # Generate .ico
    ico_path = os.path.join(BUILD_DIR, "icon.ico")
    generate_ico(png_path, ico_path)

    # Generate .icns (macOS only)
    icns_path = os.path.join(BUILD_DIR, "icon.icns")
    generate_icns(png_path, icns_path)

    print("Done!")


if __name__ == "__main__":
    main()
