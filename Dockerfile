FROM python:3.8.15

RUN mkdir /knic-jupyter

COPY KNICS_Jupyter_frontend /knic-jupyter/KNICS_Jupyter_frontend
COPY requirements.txt /knic-jupyter/requirements.txt

RUN pip install --upgrade pip
RUN pip install -r /knic-jupyter/requirements.txt

WORKDIR /knic-jupyter
