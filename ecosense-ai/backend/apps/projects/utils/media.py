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


def generate_reconnaissance_plate_image(plate_title: str, orientation: str, observation: str, 
                                        lat: float, lon: float, date_str: str, 
                                        theme: str = "site") -> BytesIO:
    """
    Renders a realistic photographic plate image conforming to NEMA EIA standards.
    Used for the 2x2 Photographic Matrix in Annex A when field photos are compiled.
    """
    w, h = 640, 420
    # Theme color base
    color_map = {
        "site": ((34, 50, 38), (55, 78, 59)),        # Grass / Vegetation greens
        "access": ((50, 52, 58), (75, 78, 86)),      # Bitumen / Tarmac greys
        "boundary": ((60, 50, 42), (90, 75, 62)),    # Fence / Wall earths
        "drainage": ((35, 52, 68), (50, 75, 98)),    # Water / Drainage blues
    }
    c_dark, c_light = color_map.get(theme, ((30, 41, 59), (51, 65, 85)))

    img = Image.new("RGB", (w, h), color=c_dark)
    draw = ImageDraw.Draw(img)

    # Graded field gradient background
    for y in range(h):
        factor = y / float(h)
        r = int(c_dark[0] * (1 - factor) + c_light[0] * factor)
        g = int(c_dark[1] * (1 - factor) + c_light[1] * factor)
        b = int(c_dark[2] * (1 - factor) + c_light[2] * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Horizon line and perspective elements
    draw.line([(0, int(h * 0.45)), (w, int(h * 0.45))], fill=(min(255, c_light[0] + 30), min(255, c_light[1] + 30), min(255, c_light[2] + 30)), width=1)

    # Top Tag: Orientation badge
    font = ImageFont.load_default()
    draw.rectangle([12, 12, 180, 36], fill=(15, 23, 42, 230), outline=(255, 255, 255, 255), width=1)
    draw.text((20, 18), f"ORIENTATION: {orientation.upper()}", fill=(255, 255, 255), font=font)

    # Center Subject Label
    draw.rectangle([w // 2 - 160, h // 2 - 25, w // 2 + 160, h // 2 + 25], fill=(15, 23, 42, 220), outline=(148, 163, 184, 255), width=1)
    draw.text((w // 2 - 145, h // 2 - 15), plate_title.upper(), fill=(255, 255, 255), font=font)
    draw.text((w // 2 - 145, h // 2 + 2), f"Reconnaissance Baseline Survey", fill=(148, 163, 184), font=font)

    # Bottom Watermark Strip
    draw.rectangle([0, h - 45, w, h], fill=(15, 23, 42, 240))
    draw.rectangle([0, h - 46, w, h - 45], fill=(239, 68, 68, 255)) # red accent line

    coord_str = f"GPS: {to_dms_str(lat, True)}, {to_dms_str(lon, False)}"
    draw.text((12, h - 34), f"ECOSENSE RECONNAISSANCE EVIDENCE | {coord_str}", fill=(255, 255, 255), font=font)
    draw.text((12, h - 18), f"Date Recorded: {date_str} | Verified by Registered Lead Expert", fill=(148, 163, 184), font=font)

    out = BytesIO()
    img.save(out, format="JPEG", quality=85)
    out.seek(0)
    return out
