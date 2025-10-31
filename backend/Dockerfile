FROM python:3.12-slim-bookworm

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY uv.lock pyproject.toml ./

RUN uv sync --frozen --no-dev

COPY app/ /app/

# Add app to Python path (safe expansion)
ENV PYTHONPATH="/app:${PYTHONPATH:-}"

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
