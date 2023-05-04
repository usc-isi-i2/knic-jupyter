# knic-jupyter

Jupyter Lab for the KNIC Project

## Installation

```console
git clone git@github.com:usc-isi-i2/knic-jupyter.git
cd knic-jupyter
conda env create --file environment.yaml
conda activate knic-jupyter
pip install -ve .
```

## Running the lab

```console
jupyter lab --port 5644 --no-browser --IdentityProvider.token='' --ServerApp.password='' --ServerApp.allow_origin='*' --allow-root
```
