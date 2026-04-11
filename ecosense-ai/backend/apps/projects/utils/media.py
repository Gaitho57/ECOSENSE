import os
from io import BytesIO
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)

def process_field_image(image_file, latitude=None, longitude=None, quality=70, max_size=(1600, 1600)):
    """
    Compresses image and overlays GPS/Timestamp watermark for professional EIA evidence.
    """
    try:
        img = Image.open(image_file)
        
        # 1. Orientation Fix (Handle EXIF rotation if present)
        try:
             from PIL import ImageOps
             img = ImageOps.exif_transpose(img)
        except Exception:
             pass

        # 2. Compression & Resizing
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        # 3. Watermarking
        draw = ImageDraw.Draw(img)
        
        # Prepare text strings
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        gps_text = f"Lat: {latitude}, Lng: {longitude}" if latitude and longitude else "GPS Data Missing"
        watermark_text = f"ECOSENSE EVIDENCE | {timestamp}\n{gps_text}"
        
        # Determine text positioning (bottom right)
        width, height = img.size
        
        # Simple font fallback
        try:
            # Try to load a standard font if available
            font = ImageFont.load_default()
        except Exception:
            font = None

        # Draw background rectangle for readability
        text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        margin = 20
        rect_x1 = width - text_width - margin - 10
        rect_y1 = height - text_height - margin - 10
        rect_x2 = width - margin + 10
        rect_y2 = height - margin + 10
        
        draw.rectangle([rect_x1, rect_y1, rect_x2, rect_y2], fill=(0, 0, 0, 150))
        draw.text((rect_x1 + 10, rect_y1 + 5), watermark_text, fill=(255, 255, 255), font=font)

        # 4. Save to BytesIO
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        return ContentFile(output.read(), name=os.path.basename(image_file.name))
        
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return image_file # Fallback to original on failure
