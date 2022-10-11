import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { INotebookTracker, INotebookWidgetFactory, Notebook, NotebookPanel } from '@jupyterlab/notebook';
/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  requires: [INotebookTracker, INotebookWidgetFactory],
  activate: (app: JupyterFrontEnd, notebookTracker:INotebookTracker) => {
    console.log('JupyterLab extension KNICS_Jupyter_frontend is activated!');
    notebookTracker.widgetAdded.connect(onWidgetAdded, this);
    notebookTracker.activeCellChanged.connect(logActiveCell, this);
    
  }
};

function onWidgetAdded(emitter: INotebookTracker, args:NotebookPanel){
  args.content.modelContentChanged.connect(onModelContentChanged);
}

function onModelContentChanged(emitter:  Notebook){
  console.log(emitter.model?.toJSON());
}

function logActiveCell(emitter: INotebookTracker, args:Cell<ICellModel> | null):void 
{
  console.log(emitter.activeCell?.inputArea.model.value);
}

export default plugin;
