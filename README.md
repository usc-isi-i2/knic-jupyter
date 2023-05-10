# knic-jupyter

Jupyter Lab for the KNIC Project at USC ISI (Information Sciences Institute)

## Installation

Follow the steps below to install `knic-jupyter`:

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

## Development

KNIC Jupyter lab extension is built with `knic-engine` location set to [https://knic.isi.edu/engine](https://knic.isi.edu/engine)

If you are running `knic-engine` locally for development purposes, for example on `http://localhost:5642/knic`, you would need to change this [SERVER_ENDPOINT](https://github.com/usc-isi-i2/knic-jupyter/blob/main/src/index.ts#L169) variable.

For example:

```js
const SERVER_ENDPOINT = `http://localhost:5642/knic/user/${USER}/event`;
```

After that you would need to rebuild `knic-jupyter` for the changes to take effect:

```console
pip install -ve .
./run-jupyter-lab.sh
```
