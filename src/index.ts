import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { INotebookTracker, KernelError, Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { Dexie } from 'dexie';

/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */

let db:Dexie;

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker:INotebookTracker ) => {
    db = setupDB();
    console.log('JupyterLab extension KNICS_Jupyter_frontend is activated!');
    notebookTracker.widgetAdded.connect(onWidgetAdded, this);
    notebookTracker.activeCellChanged.connect(logActiveCell, this);
    NotebookActions.executed.connect(onCellExecutionEnded, this);
    NotebookActions.executionScheduled.connect(onCellExecutionBegin, this);
  }
};

let timeout:number = 0;

function setupDB():Dexie{
  db = new Dexie("database");

  db.version(1).stores({
		logs: '++id, eventName, data'
	});

  return db;
}

async function onCellExecutionBegin(emitter:any, args:{notebook:Notebook, cell: Cell<ICellModel>}):Promise<void>
{
  console.log("CELL_EXECUTION_BEGIN");
  console.log(args.cell.model.toJSON());
  await db.table("logs").add({
		eventName: "CELL_EXECUTION_BEGIN",
    data:args.cell.model.toJSON(),
	});
}

async function onCellExecutionEnded(emitter:any, args:{ notebook: Notebook; cell: Cell<ICellModel>;success: boolean; error?: KernelError | null  }):Promise<void>
{
  console.log("CELL_EXECUTED_ENDED");
  console.log(args.cell.model.toJSON());
  await db.table("logs").add({
		eventName: "CELL_EXECUTED_ENDED",
    data:args.cell.model.toJSON(),
	});
}

async function onWidgetAdded(emitter: INotebookTracker, args:NotebookPanel):Promise<void>{
  args.content.modelContentChanged.connect(onModelContentChanged);
  console.log("OPEN FILE");
  console.log(args.model?.toJSON());
  await db.table("logs").add({
		eventName: "OPEN_FILE",
    data:args.model?.toJSON(),
	});
}

async function onModelContentChanged(emitter:  Notebook): Promise<void>{
  if(timeout)
    clearTimeout(timeout)
  timeout = setTimeout(async () => {
    console.log("MODEL_CHANGED");
    console.log(emitter.model?.toJSON());
    await db.table("logs").add({
      eventName: "MODEL_CHANGED",
      data:emitter.model?.toJSON(),
    });
  }, 5000);
}

async function logActiveCell(emitter: INotebookTracker, args:Cell<ICellModel> | null):Promise<void>
{
  console.log("LOG ACTIVE CELL");
  console.log(args?.model.toJSON());
  await db.table("logs").add({
		eventName: "LOG_ACTIVE_CELL",
    data:args?.model.toJSON(),
	});
}

export default plugin;
