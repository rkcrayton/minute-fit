import pytest
from fastapi import HTTPException

from routers.users import _check_magic_bytes, _sanitize_avatar
from helpers import make_jpeg_bytes


# ---------------------------------------------------------------------------
# _check_magic_bytes
# ---------------------------------------------------------------------------

def test_check_magic_bytes_jpeg():
    assert _check_magic_bytes(b'\xff\xd8\xff' + b'\x00' * 20) is True


def test_check_magic_bytes_png():
    assert _check_magic_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00' * 20) is True


def test_check_magic_bytes_heic():
    data = b'\x00\x00\x00\x18' + b'ftyp' + b'\x00' * 20
    assert _check_magic_bytes(data) is True


def test_check_magic_bytes_invalid():
    assert _check_magic_bytes(b'%PDF-1.4' + b'\x00' * 20) is False


def test_check_magic_bytes_empty():
    assert _check_magic_bytes(b'') is False


# ---------------------------------------------------------------------------
# _sanitize_avatar
# ---------------------------------------------------------------------------

def test_sanitize_avatar_valid_jpeg():
    raw = make_jpeg_bytes(10, 10)
    result = _sanitize_avatar(raw)
    assert isinstance(result, bytes)
    assert result[:3] == b'\xff\xd8\xff'


def test_sanitize_avatar_invalid_data_raises_400():
    with pytest.raises(HTTPException) as exc:
        _sanitize_avatar(b'not an image at all')
    assert exc.value.status_code == 400
