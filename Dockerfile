FROM python:3.11-slim

WORKDIR /app

COPY . /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV SERVER_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${SERVER_PORT}/health || exit 1

CMD ["sh", "-c", "python server.py --host 0.0.0.0 --port ${SERVER_PORT}"]
