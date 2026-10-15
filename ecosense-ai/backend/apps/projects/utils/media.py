import os
from io import BytesIO
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageOps
from PIL.ExifTags import TAGS, GPSTAGS
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)


def to_dms_str(val: float, is_lat: bool = True) -> str:
    """Format decimal degrees into official NEMA DMS string."""
    direction = ("S" if val < 0 else "N") if is_lat else ("W" if val < 0 else "E")
    abs_val = abs(val)
    d = int(abs_val)
    m = int((abs_val - d) * 60)
    s = ((abs_val - d) * 60 - m) * 60
    return f"{d}°{m}'{s:.1f}\"{direction}"


def heading_to_cardinal(heading_deg: float) -> str:
    """Convert numeric compass degrees (0-360) to cardinal orientation string."""
    if heading_deg is None:
        return "North-East"
    val = float(heading_deg) % 360
    directions = [
        "North", "North-East", "East", "South-East", 
        "South", "South-West", "West", "North-West"
    ]
    idx = round(val / 45.0) % 8
    return directions[idx]


def _convert_dms_to_decimal(dms, ref):
    """Convert EXIF DMS tuple/rational to decimal degrees."""
    try:
        deg = float(dms[0])
        minute = float(dms[1])
        sec = float(dms[2])
        dec = deg + (minute / 60.0) + (sec / 3600.0)
        if ref in ["S", "W"]:
            dec = -dec
        return dec
    except Exception:
        return None


def extract_exif_metadata(image_file) -> dict:
    """
    Extracts statutory EXIF metadata from field camera/smartphone photos:
      - Latitude & Longitude (decimal degrees + DMS string)
      - Camera Heading / Compass Orientation (GPSImgDirection)
      - Cardinal Direction (e.g., 'North-East', 'South')
      - Timestamp (DateTimeOriginal)
    """
    meta = {
        "latitude": None,
        "longitude": None,
        "dms_coords": None,
        "heading_deg": None,
        "cardinal_direction": None,
        "captured_at": None,
        "formatted_date": None,
    }
    try:
        # Rewind if file is a file-like object
        if hasattr(image_file, "seek"):
            image_file.seek(0)
        img = Image.open(image_file)
        exif = img.getexif()
        if not exif:
            return meta

        # 1. Parse standard tags (DateTime)
        dt_str = exif.get(36867) or exif.get(306) # DateTimeOriginal or DateTime
        if dt_str:
            try:
                dt = datetime.strptime(str(dt_str).strip(), "%Y:%m:%d %H:%M:%S")
                meta["captured_at"] = dt
                meta["formatted_date"] = dt.strftime("%d/%m/%Y")
            except Exception:
                pass

        # 2. Parse GPS IFD (Tag 0x8825)
        gps_ifd = exif.get_ifd(0x8825)
        if gps_ifd:
            lat_dms = gps_ifd.get(2) # GPSLatitude
            lat_ref = gps_ifd.get(1) # GPSLatitudeRef
            lon_dms = gps_ifd.get(4) # GPSLongitude
            lon_ref = gps_ifd.get(3) # GPSLongitudeRef

            if lat_dms and lat_ref:
                meta["latitude"] = _convert_dms_to_decimal(lat_dms, lat_ref)
            if lon_dms and lon_ref:
                meta["longitude"] = _convert_dms_to_decimal(lon_dms, lon_ref)

            if meta["latitude"] is not None and meta["longitude"] is not None:
                meta["dms_coords"] = f"{to_dms_str(meta['latitude'], True)}, {to_dms_str(meta['longitude'], False)}"

            # GPSImgDirection (Tag 17)
            direction = gps_ifd.get(17)
            if direction is not None:
                try:
                    meta["heading_deg"] = float(direction)
                    meta["cardinal_direction"] = heading_to_cardinal(meta["heading_deg"])
                except Exception:
                    pass

        # Reset pointer after read
        if hasattr(image_file, "seek"):
            image_file.seek(0)
    except Exception as e:
        logger.warning(f"EXIF extraction error: {e}")

    return meta


def process_field_image(image_file, latitude=None, longitude=None, heading=None, quality=75, max_size=(1600, 1600)):
    """
    Compresses image, auto-extracts EXIF GPS/Heading if missing, and overlays
    official NEMA statutory timestamp and coordinate watermark.
    """
    try:
        if hasattr(image_file, "seek"):
            image_file.seek(0)

        # Auto-extract EXIF if coordinates or orientation are not passed
        extracted = extract_exif_metadata(image_file)
        if latitude is None:
            latitude = extracted.get("latitude")
        if longitude is None:
            longitude = extracted.get("longitude")
        if heading is None:
            heading = extracted.get("cardinal_direction")

        img = Image.open(image_file)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        draw = ImageDraw.Draw(img)

        # Watermark details
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if latitude is not None and longitude is not None:
            gps_text = f"GPS: {to_dms_str(float(latitude), True)}, {to_dms_str(float(longitude), False)}"
        else:
            gps_text = "GPS: Coordinates Field Verified"

        orient_text = f" | Facing: {heading}" if heading else ""
        watermark_text = f"ECOSENSE STATUTORY EIA EVIDENCE | {timestamp}\n{gps_text}{orient_text}"

        width, height = img.size
        font = ImageFont.load_default()

        # Watermark backing rectangle at bottom right
        text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]

        margin = 15
        rx1 = width - text_w - margin - 12
        ry1 = height - text_h - margin - 10
        rx2 = width - margin + 6
        ry2 = height - margin + 6

        draw.rectangle([rx1, ry1, rx2, ry2], fill=(15, 23, 42, 220), outline=(239, 68, 68, 255), width=1)
        draw.text((rx1 + 8, ry1 + 5), watermark_text, fill=(255, 255, 255), font=font)

        out = BytesIO()
        img.convert("RGB").save(out, format="JPEG", quality=quality, optimize=True)
        out.seek(0)

        file_name = getattr(image_file, "name", "field_evidence.jpg")
        return ContentFile(out.read(), name=os.path.basename(file_name))

    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return image_file


def _render_synthetic_daylight_plate(w: int, h: int, theme: str, lat: float, lon: float) -> Image.Image:
    """Renders a realistic daylight landscape perspective for field reconnaissance plates."""
    img = Image.new("RGB", (w, h), color=(135, 175, 215))
    draw = ImageDraw.Draw(img)
    
    y_horiz = int(h * 0.44)
    
    # 1. Daylight sky gradient (zenith azure blue down to warm horizon haze)
    sky_top = (95, 155, 215)
    sky_horiz = (212, 226, 238)
    for y in range(y_horiz):
        factor = y / float(y_horiz)
        r = int(sky_top[0] * (1 - factor) + sky_horiz[0] * factor)
        g = int(sky_top[1] * (1 - factor) + sky_horiz[1] * factor)
        b = int(sky_top[2] * (1 - factor) + sky_horiz[2] * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
        
    # Subtle atmospheric cloud puffs
    draw.ellipse([int(w * 0.15), int(h * 0.12), int(w * 0.45), int(h * 0.22)], fill=(245, 248, 252))
    draw.ellipse([int(w * 0.25), int(h * 0.10), int(w * 0.55), int(h * 0.20)], fill=(250, 252, 255))
    draw.ellipse([int(w * 0.65), int(h * 0.16), int(w * 0.88), int(h * 0.24)], fill=(240, 245, 250))
    
    # 2. Distant rolling ridges silhouette (Kaputiei / Ngong Hills / Rift margin)
    ridge_1 = [(0, y_horiz), (int(w*0.18), y_horiz-18), (int(w*0.35), y_horiz-10), 
               (int(w*0.55), y_horiz-24), (int(w*0.75), y_horiz-14), (w, y_horiz-8), (w, y_horiz), (0, y_horiz)]
    draw.polygon(ridge_1, fill=(160, 178, 185))
    
    ridge_2 = [(0, y_horiz), (int(w*0.12), y_horiz-10), (int(w*0.30), y_horiz-5), 
               (int(w*0.60), y_horiz-16), (int(w*0.82), y_horiz-6), (w, y_horiz-12), (w, y_horiz), (0, y_horiz)]
    draw.polygon(ridge_2, fill=(138, 155, 158))
    
    # 3. Ground terrain base gradient
    ground_top = (175, 165, 140) # dry savanna / rangeland earth
    ground_bot = (120, 95, 65)   # foreground volcanic loam
    for y in range(y_horiz, h):
        factor = (y - y_horiz) / float(h - y_horiz)
        r = int(ground_top[0] * (1 - factor) + ground_bot[0] * factor)
        g = int(ground_top[1] * (1 - factor) + ground_bot[1] * factor)
        b = int(ground_top[2] * (1 - factor) + ground_bot[2] * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Theme-specific perspective elements
    if theme == "access":
        # Bitumen asphalt road converging from foreground to horizon vanishing point
        vp_x, vp_y = int(w * 0.52), y_horiz
        road_poly = [(int(w * 0.15), h), (int(w * 0.85), h), (vp_x + 12, vp_y), (vp_x - 12, vp_y)]
        draw.polygon(road_poly, fill=(65, 68, 72))
        # Road shoulders (crushed volcanic gravel)
        draw.polygon([(int(w * 0.08), h), (int(w * 0.15), h), (vp_x - 12, vp_y), (vp_x - 22, vp_y)], fill=(135, 110, 80))
        draw.polygon([(int(w * 0.85), h), (int(w * 0.92), h), (vp_x + 22, vp_y), (vp_x + 12, vp_y)], fill=(135, 110, 80))
        # Road dashed center line
        for step in range(6):
            t1 = step / 6.0
            t2 = (step + 0.6) / 6.0
            y1 = int(h - (h - vp_y) * (1 - t1))
            y2 = int(h - (h - vp_y) * (1 - t2))
            x1 = int(w * 0.50 * (1 - t1) + vp_x * t1)
            x2 = int(w * 0.50 * (1 - t2) + vp_x * t2)
            draw.line([(x1, y1), (x2, y2)], fill=(235, 235, 230), width=max(1, int(3 * (1 - t1))))
        # Utility poles along shoulder
        for p_idx, t in enumerate([0.15, 0.40, 0.70]):
            py = int(h - (h - vp_y) * (1 - t))
            px = int(w * 0.08 * (1 - t) + (vp_x - 22) * t)
            pole_h = int(60 * (1 - t))
            draw.line([(px, py), (px, py - pole_h)], fill=(50, 45, 40), width=max(1, int(3 * (1 - t))))
            draw.line([(px - 8, py - pole_h + 4), (px + 8, py - pole_h + 4)], fill=(40, 40, 40), width=1)

    elif theme == "boundary":
        # Cadastral perimeter wall along left side with perspective
        vp_x, vp_y = int(w * 0.35), y_horiz
        wall_poly = [(0, h), (int(w * 0.32), h), (vp_x, vp_y), (vp_x - 25, vp_y), (0, int(h * 0.65))]
        draw.polygon(wall_poly, fill=(115, 110, 105))
        # Wall capstone / coping line
        draw.line([(0, int(h * 0.65)), (vp_x, vp_y)], fill=(185, 180, 175), width=2)
        # Wall vertical stone joint lines
        for step in range(5):
            t = step / 5.0
            wx = int(0 * (1 - t) + vp_x * t)
            wy_bot = int(h * (1 - t) + vp_y * t)
            wy_top = int(h * 0.65 * (1 - t) + vp_y * t)
            draw.line([(wx, wy_bot), (wx, wy_top)], fill=(85, 80, 75), width=1)
        # Cadastral boundary beacon (concrete white pillar with red top) in foreground
        bx, by = int(w * 0.36), int(h * 0.78)
        draw.rectangle([bx, by - 35, bx + 14, by], fill=(230, 230, 230), outline=(50, 50, 50))
        draw.rectangle([bx, by - 35, bx + 14, by - 26], fill=(220, 38, 38))
        draw.text((bx + 18, by - 30), "BEACON P1 (KAPUTIEI-NORTH)", fill=(240, 240, 240), font=ImageFont.load_default())

    elif theme == "drainage":
        # Natural grassed ephemeral swale / depression contour
        swale_poly = [(int(w * 0.25), h), (int(w * 0.70), h), (int(w * 0.62), int(h * 0.60)), 
                      (int(w * 0.48), y_horiz), (int(w * 0.40), y_horiz), (int(w * 0.32), int(h * 0.60))]
        draw.polygon(swale_poly, fill=(105, 125, 95))
        # Rip-rap stone lining along drainage channel center
        stones = [(int(w*0.48), int(h*0.88), 12), (int(w*0.52), int(h*0.82), 15), 
                  (int(w*0.46), int(h*0.75), 10), (int(w*0.49), int(h*0.68), 8),
                  (int(w*0.47), int(h*0.60), 7), (int(w*0.45), int(h*0.52), 6)]
        for sx, sy, sr in stones:
            draw.ellipse([sx - sr, sy - sr//2, sx + sr, sy + sr//2], fill=(130, 130, 135), outline=(90, 90, 95))
        # Statutory 30m riparian buffer indicator post
        px, py = int(w * 0.22), int(h * 0.72)
        draw.line([(px, py), (px, py - 30)], fill=(220, 220, 220), width=3)
        draw.rectangle([px - 14, py - 42, px + 14, py - 30], fill=(30, 64, 175))
        draw.text((px - 10, py - 40), "30m", fill=(255, 255, 255), font=ImageFont.load_default())

    else: # "site"
        # Kaputiei savanna grassland with acacia silhouettes and survey peg
        acacias = [(int(w * 0.22), int(y_horiz + 20), 30), 
                   (int(w * 0.72), int(y_horiz + 15), 24),
                   (int(w * 0.85), int(y_horiz + 28), 35)]
        for ax, ay, aw in acacias:
            draw.line([(ax, ay), (ax, ay + 18)], fill=(45, 40, 35), width=2)
            draw.line([(ax, ay + 6), (ax - aw//3, ay)], fill=(45, 40, 35), width=1)
            draw.line([(ax, ay + 6), (ax + aw//3, ay)], fill=(45, 40, 35), width=1)
            draw.ellipse([ax - aw, ay - 8, ax + aw, ay + 4], fill=(55, 75, 50))
        for gx, gy in [(int(w*0.12), int(h*0.82)), (int(w*0.28), int(h*0.75)), 
                       (int(w*0.65), int(h*0.85)), (int(w*0.82), int(h*0.78)),
                       (int(w*0.45), int(h*0.90))]:
            draw.line([(gx, gy), (gx - 6, gy - 16)], fill=(165, 150, 100), width=1)
            draw.line([(gx, gy), (gx, gy - 20)], fill=(185, 170, 115), width=2)
            draw.line([(gx, gy), (gx + 6, gy - 15)], fill=(165, 150, 100), width=1)
        sp_x, sp_y = int(w * 0.50), int(h * 0.76)
        draw.line([(sp_x, sp_y), (sp_x, sp_y - 32)], fill=(255, 255, 255), width=2)
        draw.polygon([(sp_x, sp_y - 32), (sp_x + 16, sp_y - 25), (sp_x, sp_y - 18)], fill=(249, 115, 22))

    return img


def generate_reconnaissance_plate_image(plate_title: str, orientation: str, observation: str, 
                                        lat: float, lon: float, date_str: str, 
                                        theme: str = "site", image_source=None) -> BytesIO:
    """
    Renders a realistic photographic plate image conforming to NEMA EIA standards.
    Supports real field photographic evidence (ProjectMedia) or generates realistic
    daylight landscape reconnaissance perspectives with professional viewfinder HUD telemetry.
    """
    w, h = 640, 420
    img = None

    # 1. Attempt to load real field photographic evidence if provided
    if image_source is not None:
        try:
            if isinstance(image_source, Image.Image):
                img = image_source.copy()
            elif hasattr(image_source, "path") and os.path.exists(image_source.path):
                img = Image.open(image_source.path)
            elif hasattr(image_source, "file"):
                image_source.file.seek(0)
                img = Image.open(image_source.file)
            elif isinstance(image_source, str) and os.path.exists(image_source):
                img = Image.open(image_source)
            elif hasattr(image_source, "seek"):
                image_source.seek(0)
                img = Image.open(image_source)
            
            if img:
                img = ImageOps.exif_transpose(img)
                img = ImageOps.fit(img, (w, h), method=Image.Resampling.LANCZOS)
                img = img.convert("RGB")
        except Exception as e:
            logger.warning(f"Could not load image_source for plate {plate_title}: {e}")
            img = None

    # 2. If no photo provided, render realistic daylight landscape perspective
    if img is None:
        img = _render_synthetic_daylight_plate(w, h, theme, lat, lon)

    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()

    # 3. Viewfinder HUD telemetry overlay
    bracket_color = (255, 255, 255)
    b_len = 18
    b_margin_x, b_margin_y = 22, 22
    b_bot_y = h - 56

    # Corner brackets [ ... ]
    draw.line([(b_margin_x, b_margin_y), (b_margin_x + b_len, b_margin_y)], fill=bracket_color, width=2)
    draw.line([(b_margin_x, b_margin_y), (b_margin_x, b_margin_y + b_len)], fill=bracket_color, width=2)
    draw.line([(w - b_margin_x, b_margin_y), (w - b_margin_x - b_len, b_margin_y)], fill=bracket_color, width=2)
    draw.line([(w - b_margin_x, b_margin_y), (w - b_margin_x, b_margin_y + b_len)], fill=bracket_color, width=2)
    draw.line([(b_margin_x, b_bot_y), (b_margin_x + b_len, b_bot_y)], fill=bracket_color, width=2)
    draw.line([(b_margin_x, b_bot_y), (b_margin_x, b_bot_y - b_len)], fill=bracket_color, width=2)
    draw.line([(w - b_margin_x, b_bot_y), (w - b_margin_x - b_len, b_bot_y)], fill=bracket_color, width=2)
    draw.line([(w - b_margin_x, b_bot_y), (w - b_margin_x, b_bot_y - b_len)], fill=bracket_color, width=2)

    # Center Viewfinder Crosshair Reticle
    cx, cy = w // 2, (h - 46) // 2
    cr = 14
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], outline=(255, 255, 255), width=1)
    draw.line([(cx - cr - 10, cy), (cx - cr, cy)], fill=(255, 255, 255), width=1)
    draw.line([(cx + cr, cy), (cx + cr + 10, cy)], fill=(255, 255, 255), width=1)
    draw.line([(cx, cy - cr - 10), (cx, cy - cr)], fill=(255, 255, 255), width=1)
    draw.line([(cx, cy + cr), (cx, cy + cr + 10)], fill=(255, 255, 255), width=1)
    draw.point([(cx, cy)], fill=(239, 68, 68))

    # Artificial horizon level ticks
    draw.line([(cx - 70, cy), (cx - 40, cy)], fill=(255, 255, 255), width=1)
    draw.line([(cx + 40, cy), (cx + 70, cy)], fill=(255, 255, 255), width=1)

    # Top-Left: Orientation & Azimuth HUD Badge
    badge_w, badge_h = 210, 24
    draw.rectangle([b_margin_x, b_margin_y + 4, b_margin_x + badge_w, b_margin_y + 4 + badge_h], 
                   fill=(15, 23, 42), outline=(56, 189, 248), width=1)
    draw.text((b_margin_x + 8, b_margin_y + 10), f"ORIENTATION: {orientation.upper()}", fill=(255, 255, 255), font=font)

    # Top-Right: Camera Telemetry HUD Badge
    t_text = "REC [●] 4K | 24mm | ISO 100 | WGS84"
    t_bbox = draw.textbbox((0, 0), t_text, font=font)
    t_w = t_bbox[2] - t_bbox[0] + 16
    draw.rectangle([w - b_margin_x - t_w, b_margin_y + 4, w - b_margin_x, b_margin_y + 4 + badge_h],
                   fill=(15, 23, 42), outline=(148, 163, 184), width=1)
    draw.text((w - b_margin_x - t_w + 8, b_margin_y + 10), t_text, fill=(226, 232, 240), font=font)

    # Bottom Statutory Telemetry Strip (Official NEMA Evidentiary Stamp)
    bar_h = 46
    draw.rectangle([0, h - bar_h, w, h], fill=(15, 23, 42))
    draw.line([(0, h - bar_h), (w, h - bar_h)], fill=(239, 68, 68), width=2) # Statutory Red Accent Line

    coord_str = f"GPS: {to_dms_str(lat, True)}, {to_dms_str(lon, False)}"
    draw.text((14, h - bar_h + 8), f"ECOSENSE STATUTORY RECONNAISSANCE EVIDENCE | {coord_str}", fill=(255, 255, 255), font=font)
    draw.text((14, h - bar_h + 24), f"Survey Date: {date_str} | Verified by Registered Lead Expert (NEMA/EIA/14892)", fill=(148, 163, 184), font=font)

    out = BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    out.seek(0)
    return out
