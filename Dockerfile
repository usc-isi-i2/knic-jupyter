# syntax=docker/dockerfile:1

FROM python:3.10.14-slim-bookworm

RUN apt-get -y update \
    && apt-get --no-install-recommends -y install gcc=4:12.2.0-3 python3-dev=3.11.2-1+b1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /lab_src/notebooks

WORKDIR /lab_src

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip==24.0 \
    && pip install --no-cache-dir -r requirements.txt

COPY --from=node:20.12.2-bookworm-slim / /

COPY *.config.js .
COPY *.md .
COPY LICENSE .
COPY MANIFEST.in .
COPY install.json .
COPY package.json .
COPY pyproject.toml .
COPY setup.py .
COPY src/ src/
COPY style/ style/
COPY tsconfig.json .
COPY ui-tests/ ui-tests/
COPY yarn.lock .

RUN pip install --no-cache-dir .

COPY config.py .

EXPOSE 5644

LABEL org.opencontainers.image.source=https://github.com/usc-isi-i2/knic-jupyter
