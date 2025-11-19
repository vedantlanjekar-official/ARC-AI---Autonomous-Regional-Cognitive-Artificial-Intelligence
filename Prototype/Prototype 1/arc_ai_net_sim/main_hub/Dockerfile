FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY common ./common
COPY main_hub ./main_hub
COPY network_sim ./network_sim

EXPOSE 8000

CMD ["uvicorn", "main_hub.app:app", "--host", "0.0.0.0", "--port", "8000"]

