import io


def make_jpeg_bytes(width: int = 10, height: int = 10) -> bytes:
    """Return minimal valid JPEG bytes for upload tests."""
    from PIL import Image

    img = Image.new("RGB", (width, height), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
