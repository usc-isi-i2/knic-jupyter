import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { INotebookTracker, KernelError, Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker:INotebookTracker ) => {
    console.log('JupyterLab extension KNICS_Jupyter_frontend is activated!');
    notebookTracker.widgetAdded.connect(onWidgetAdded, this);
    notebookTracker.activeCellChanged.connect(logActiveCell, this);
    NotebookActions.executed.connect(onCellExecutionEnded, this);
    NotebookActions.executionScheduled.connect(onCellExecutionBegin, this);
  }
};

let timeout:number = 0;

function onCellExecutionBegin(emitter:any, args:{notebook:Notebook, cell: Cell<ICellModel>})
{
  console.log("CELL_EXECUTION_BEGIN");
  console.log(args.cell.model.toJSON());
}

function onCellExecutionEnded(emitter:any, args:{ notebook: Notebook; cell: Cell<ICellModel>;success: boolean; error?: KernelError | null  })
{
  console.log("CELL_EXECUTED_ENDED");
  console.log(args.cell.model.toJSON());
}

function onWidgetAdded(emitter: INotebookTracker, args:NotebookPanel){
  args.content.modelContentChanged.connect(onModelContentChanged);
  console.log("OPEN FILE");
  console.log(args.model?.toJSON());
}

function onModelContentChanged(emitter:  Notebook){
  if(timeout)
    clearTimeout(timeout)
  timeout = setTimeout(() => {
    console.log("MODEL_CHANGED");
    console.log(emitter.model?.toJSON());
  }, 5000);
}

function logActiveCell(emitter: INotebookTracker, args:Cell<ICellModel> | null):void 
{
  console.log("LOG ACTIVE CELL");
  console.log(args?.model.toJSON());
}

export default plugin;
