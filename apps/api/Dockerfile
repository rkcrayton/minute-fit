FROM python:3.11-slim

WORKDIR /app

# system deps (optional but handy)
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  libgl1 \
  libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    chown -R appuser:appuser /usr/local/lib/python3.11/site-packages/mediapipe/

COPY --chown=appuser:appuser app/ .

RUN mkdir -p /app/artifacts/uploads /app/artifacts/processed /app/artifacts/measurements && \
    chown -R appuser:appuser /app/artifacts

USER appuser

EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
