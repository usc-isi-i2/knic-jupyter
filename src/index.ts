import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension KNICS_Jupyter_frontend is activated!');
  }
};

export default plugin;
