import io
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from PIL import Image as PILImage
import logging
from datetime import timezone

import auth
from limiter import limiter
from models.user import User
from models.refresh_token import RefreshToken
from schemas.user import UserCreate, UserResponse, UserUpdate
from schemas.auth import Token, RefreshRequest, LogoutRequest
from jose import JWTError, jwt
from database import get_db

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# Avatar storage
AVATARS_DIR = Path(__file__).resolve().parent.parent / "artifacts" / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif"}


def _check_magic_bytes(data: bytes) -> bool:
    if data[:3] == b'\xff\xd8\xff':
        return True
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return True
    if len(data) >= 12 and data[4:8] == b'ftyp':
        return True
    return False


def _sanitize_avatar(raw: bytes) -> bytes:
    try:
        img = PILImage.open(io.BytesIO(raw))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="File could not be decoded as a valid image.")
    img = PILImage.open(io.BytesIO(raw))
    img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=90)
    return out.getvalue()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register_user(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already registered")

        hashed_password = auth.get_password_hash(user.password)

        db_user = User(
            email=user.email,
            username=user.username,
            hashed_password=hashed_password,
            first_name=user.first_name,
            last_name=user.last_name,
            age=user.age,
            weight=user.weight,
            height=user.height,
            fitness_goal=user.fitness_goal,
            gender=user.gender,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user
    except Exception as e:
        print(f"error: {e}")
        import traceback
        traceback.print_exc()
        raise

@router.post("/token", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    refresh_token, jti, expires_at = auth.create_refresh_token(data={"sub": user.username})

    db.add(RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at))
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/token/refresh", response_model=Token)
@limiter.limit("20/minute")
def refresh_token(request: Request, body: RefreshRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(body.refresh_token, auth.settings.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("type") != "refresh":
            raise credentials_exception
        username: str = payload.get("sub")
        jti: str = payload.get("jti")
        if username is None or jti is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Verify the token is in the store and has not been revoked (one-time use)
    stored = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if stored is None or stored.revoked_at is not None:
        _log.warning("Refresh attempt with missing or revoked jti=%s", jti)
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    # Revoke the consumed token before issuing the replacement
    stored.revoked_at = datetime.utcnow()

    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh_token, new_jti, new_expires_at = auth.create_refresh_token(data={"sub": user.username})

    db.add(RefreshToken(jti=new_jti, user_id=user.id, expires_at=new_expires_at))
    db.commit()

    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    """Revoke the supplied refresh token so it can never be used again."""
    try:
        payload = jwt.decode(body.refresh_token, auth.settings.SECRET_KEY, algorithms=[auth.ALGORITHM])
        jti: str = payload.get("jti")
    except JWTError:
        # Expired or invalid token — nothing to revoke, treat as success
        return

    if jti:
        stored = db.query(RefreshToken).filter(
            RefreshToken.jti == jti,
            RefreshToken.revoked_at.is_(None),
        ).first()
        if stored:
            stored.revoked_at = datetime.utcnow()
            db.commit()


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(auth.get_current_user)):

    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):

    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    if user_update.age is not None:
        current_user.age = user_update.age
    if user_update.weight is not None:
        current_user.weight = user_update.weight
    if user_update.height is not None:
        current_user.height = user_update.height
    if user_update.fitness_goal is not None:
        current_user.fitness_goal = user_update.fitness_goal
    if user_update.gender is not None:
        current_user.gender = user_update.gender

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File must be jpg, png, or heic.")

    raw = file.file.read(MAX_AVATAR_BYTES + 1)
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 5 MB size limit.")

    if not _check_magic_bytes(raw):
        raise HTTPException(status_code=400, detail="File content does not match a recognised image format.")

    clean = _sanitize_avatar(raw)

    filename = f"avatar_{current_user.id}.jpg"
    dest = AVATARS_DIR / filename
    with open(dest, "wb") as f:
        f.write(clean)

    current_user.profile_picture = filename
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/avatar")
def get_avatar(current_user: User = Depends(auth.get_current_user)):
    if not current_user.profile_picture:
        raise HTTPException(status_code=404, detail="No avatar set")

    path = AVATARS_DIR / current_user.profile_picture
    if not path.exists():
        raise HTTPException(status_code=404, detail="Avatar file not found")

    return FileResponse(str(path), media_type="image/jpeg")