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

KNIC Jupyter lab extension is pre-built with `knic-engine` location set to [https://knic.isi.edu/engine](https://knic.isi.edu/engine)

If you are running `knic-engine` locally for development purposes, i.e. on `http://localhost:5642/knic`, you could add a `--develop` flag to the `run-jupyter-lab.sh` command.
This will change the endpoint of `knic-engine` from our production setting, to your local setting.

For example:

```console
./run-jupyter-lab.sh --develop
```

_NOTE: It might take a little longer to spin up jupyter lab if the `knic-engine` endpoint changed as we would need to rebuild our extension._
