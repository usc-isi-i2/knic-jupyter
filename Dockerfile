FROM python:3.8.15

RUN mkdir /lab

COPY knic-jupyter /lab/knic-jupyter
COPY requirements.txt /lab/requirements.txt
COPY pyproject.toml /lab/pyproject.toml
COPY package.json /lab/package.json
COPY setup.py /lab/setup.py
COPY README.md /lab/README.md

COPY CHANGELOG.md /lab/CHANGELOG.md
COPY MANIFEST.in /lab/MANIFEST.in
COPY RELEASE.md /lab/RELEASE.md
COPY LICENSE /lab/LICENSE

WORKDIR /lab

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN pip install -e .
