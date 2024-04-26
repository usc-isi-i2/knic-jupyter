# syntax=docker/dockerfile:1

FROM nikolaik/python-nodejs:python3.10-nodejs20-slim-canary

RUN apt-get -y update \
    && apt-get -y install gcc python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ARG ENGINE_URL_ARG

RUN mkdir -p /lab_src/notebooks

COPY . /lab_src

WORKDIR /lab_src

ENV ENGINE_URL=$ENGINE_URL_ARG

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install -e .

EXPOSE 5644

LABEL org.opencontainers.image.source=https://github.com/usc-isi-i2/knic-jupyter
