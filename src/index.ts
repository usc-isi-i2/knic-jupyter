import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { ICodeCell, IError, IOutput, IStream, MultilineString,  } from '@jupyterlab/nbformat';
import { INotebookTracker, KernelError, Notebook, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { UUID } from '@lumino/coreutils';
import { Dexie } from 'dexie';
import axios from 'axios';

const NOTEBOOK_OPENED_EVENT = "NOTEBOOK_OPENED";
const CELL_SELECTED_EVENT = "CELL_SELECTED";
const NOTEBOOK_MODIFIED_EVENT = "NOTEBOOK_MODIFIED";
const CELL_EXECUTION_BEGIN_EVENT = "CELL_EXECUTION_BEGIN";
const CELL_EXECUTED_END_EVENT = "CELL_EXECUTION_END";

const SERVER_ENDPOINT="http://localhost:8888";

interface CellData {
  cellId: string;
  type: string;
  value: string;
  metadata: any;
}

interface ErrorData {
  errorName: string;
  errorText: string;
  stackTrace: string[];
}

interface EventData {
  notebookName: string;
}

interface NotebookOpened extends EventData {}

interface CellSelected extends EventData {
  cell: CellData;
}

interface NotebookModified extends EventData {
  cells: CellData[];
}

interface CellExecutionBegin extends EventData {
  cell: CellData;
  executionCount: Number;
}

interface CellExecutionEnded extends EventData {
  cell: CellData;
  executionCount: Number | null;
  output: MultilineString[];
  errors: ErrorData[];
}

interface NotebookEvent {
  user: string;
  session: string;
  timestamp: string;
  eventName: string;
  eventData: NotebookOpened| NotebookModified | CellExecutionBegin | CellExecutionEnded | CellSelected;
}

/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */

let db:Dexie;

const USER = UUID.uuid4();
const SESSION = UUID.uuid4();

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker:INotebookTracker) => {
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
		logs: '++id, eventName, data',
	});

  return db;
}

function toCellData(cellModel: ICellModel): CellData {
  return {
    cellId: cellModel.id,
    type: cellModel.type,
    metadata: cellModel.metadata,
    value: cellModel.value.text,
  }
}

async function onCellExecutionBegin(emitter:any, args:{notebook:Notebook, cell: Cell<ICellModel>}):Promise<void>
{
  const parent: NotebookPanel = args?.notebook.parent as NotebookPanel;
  if (args?.cell.model && args.cell.model.type == 'code'){
    const model: ICodeCell = args.cell.model.toJSON() as ICodeCell;
    
    const event: NotebookEvent = {
      eventData: {
        cell: toCellData(args.cell.model),
        notebookName: parent.context.path,
        executionCount: model.execution_count
      },
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString(),
    };

    console.log(CELL_EXECUTION_BEGIN_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table("logs").add({
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      data:JSON.stringify(event, null, 2),
    });
    axios.post(SERVER_ENDPOINT, JSON.stringify(event));
  }
}

async function onCellExecutionEnded(emitter:any, args:{ notebook: Notebook; cell: Cell<ICellModel>;success: boolean; error?: KernelError | null  }):Promise<void>
{
  const parent: NotebookPanel = args?.notebook.parent as NotebookPanel;
  if (args?.cell.model && args.cell.model.type == 'code'){
    const model :ICodeCell = args.cell.model.toJSON() as ICodeCell;
    const errors:ErrorData[] = model.outputs.map((element:IOutput):ErrorData => {
      if(element.output_type == "error")
      {
        const error:IError = element as IError;
        return {
          errorName: error.ename,
          errorText: error.evalue,
          stackTrace: error.traceback,
        }
      }
      return {errorName:"", errorText: "", stackTrace:[]}
    }).filter((value)=>{ return value.errorName != ""});

    const outputs:MultilineString[] = model.outputs.map((element:IOutput)=>{
      if(element.output_type == "stream")
      {
        return (element as IStream).text;
      }
      else return [];
    }).filter((value)=>{ return value != []});

    const event: NotebookEvent = {
      eventData: {
        cell: toCellData(args.cell.model),
        notebookName: parent.context.path,
        output: outputs,
        executionCount: model.execution_count,
        errors: errors,
      },
      eventName: CELL_EXECUTED_END_EVENT,
      session: SESSION,
      user: USER,
      timestamp: new Date().toISOString(),
    };
    console.log(CELL_EXECUTED_END_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table("logs").add({
      eventName: CELL_EXECUTED_END_EVENT,
      data:JSON.stringify(event, null, 2),
    });

    axios.post(SERVER_ENDPOINT, JSON.stringify(event));
  }
}

async function onWidgetAdded(emitter: INotebookTracker, args:NotebookPanel):Promise<void>{
  args.content.modelContentChanged.connect(onModelContentChanged);
  const event: NotebookEvent = {
    eventData: {
      notebookName: args.context.path,
    },
    user: USER,
    session: SESSION,
    timestamp: new Date().toISOString(),
    eventName: NOTEBOOK_OPENED_EVENT,
  }
  console.log(NOTEBOOK_OPENED_EVENT);
  console.log(JSON.stringify(event, null, 2));
  await db.table("logs").add({
		eventName: NOTEBOOK_OPENED_EVENT,
    data:JSON.stringify(event, null, 2),
	});
  axios.post(SERVER_ENDPOINT, JSON.stringify(event));
}

async function onModelContentChanged(emitter:  Notebook): Promise<void>{
  if(timeout)
    clearTimeout(timeout)
  timeout = setTimeout(async () => {
    const parent: NotebookPanel = emitter.parent as NotebookPanel;
    const cells: CellData[] = [];
    if(emitter.model?.cells) {
      for(let index = 0; index < emitter.model.cells.length; index++)
      {
        const cellModel: ICellModel = emitter.model.cells.get(index);
        cells.push(toCellData(cellModel));
      }
    }
    const event: NotebookEvent = {
      eventData: {
        notebookName: parent.context.path,
        cells: cells,
      },
      eventName:NOTEBOOK_MODIFIED_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString(),
    };
    console.log(NOTEBOOK_MODIFIED_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table("logs").add({
      eventName: NOTEBOOK_MODIFIED_EVENT,
      data:JSON.stringify(event, null, 2),
    });
    axios.post(SERVER_ENDPOINT, JSON.stringify(event));
  }, 5000);
}

async function logActiveCell(emitter: INotebookTracker, args:Cell<ICellModel> | null):Promise<void>
{
  const parent: NotebookPanel = args?.parent?.parent as NotebookPanel;
  if (args?.model){
    const event : NotebookEvent = {
      eventData: {
        cell: toCellData(args?.model),
        notebookName: parent.context.path,
      },
      eventName: CELL_SELECTED_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString(), 
    };
    console.log(CELL_SELECTED_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table("logs").add({
      eventName: CELL_SELECTED_EVENT,
      data: JSON.stringify(event, null, 2),
    });
    axios.post(SERVER_ENDPOINT, JSON.stringify(event));
  }
}

export default plugin;
