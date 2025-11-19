FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY common ./common
COPY network_sim ./network_sim

EXPOSE 9000

CMD ["python", "-m", "network_sim.sim_server"]

