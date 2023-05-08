# knic-jupyter

Jupyter Lab for the KNIC Project

## Installation

Follow the steps below to install knic-jupyter:

```console
git clone git@github.com:usc-isi-i2/knic-jupyter.git
cd knic-jupyter
conda create --name knic-jupyter python=3.8 -y
conda activate knic-jupyter
pip install knic-jupyter
```

## Running the lab

To run jupyter lab you can use this predefined script:

```console
./run-jupyter-lab.sh
```

## Adding notebooks

You might want to copy the notebooks that you want to work on, for example:

```console
git clone git@github.com:usc-isi-i2/knic-notebooks.git notebooks
```

From there, if any additional dependencies are required you can install those using `conda install <package-name>` or `pip install <package-name>`
