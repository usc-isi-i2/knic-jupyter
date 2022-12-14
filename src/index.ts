import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Cell, ICellModel } from '@jupyterlab/cells';
import {
  ICodeCell,
  IError,
  IOutput,
  IStream,
  MultilineString
} from '@jupyterlab/nbformat';
import {
  INotebookTracker,
  KernelError,
  Notebook,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import { UUID } from '@lumino/coreutils';
import { Dexie } from 'dexie';
import axios from 'axios';

const NOTEBOOK_OPENED_EVENT = 'NOTEBOOK_OPENED';
const CELL_SELECTED_EVENT = 'CELL_SELECTED';
const NOTEBOOK_MODIFIED_EVENT = 'NOTEBOOK_MODIFIED';
const CELL_EXECUTION_BEGIN_EVENT = 'CELL_EXECUTION_BEGIN';
const CELL_EXECUTED_END_EVENT = 'CELL_EXECUTION_END';
const SPEECH_DETECTED = 'SPEECH_DETECTED';

const SERVER_ENDPOINT = 'http://localhost:8888';

interface ICellData {
  cellId: string;
  type: string;
  value: string;
  metadata: any;
}

interface IErrorData {
  errorName: string;
  errorText: string;
  stackTrace: string[];
}

interface IEventData {
  notebookName: string;
  location: string;
}

interface ICellSelected extends IEventData {
  cell: ICellData;
}

interface INotebookModified extends IEventData {
  cells: ICellData[];
}

interface ISpeechDetected extends IEventData {
  transcript: string;
}

interface ICellExecutionBegin extends IEventData {
  cell: ICellData;
  executionCount: number;
}

interface ICellExecutionEnded extends IEventData {
  cell: ICellData;
  executionCount: number | null;
  output: MultilineString[];
  errors: IErrorData[];
}

interface INotebookEvent {
  user: string;
  session: string;
  timestamp: string;
  eventName: string;
  eventData:
    | IEventData
    | INotebookModified
    | ICellExecutionBegin
    | ICellExecutionEnded
    | ICellSelected
    | ISpeechDetected;
}

export interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
let notebookNameStore = '';
let errorConnecting = false;

/**
 * Keeps the speech recognition running at all times, if it disconnects due to an error, then it tries to reconnect every 5 seconds, else instant reconnect
 */
function setupPerpetualSpeechRecognition() {
  const { webkitSpeechRecognition }: IWindow = <IWindow>(<unknown>window);
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.addEventListener('start', () => {
    console.log('speech recognition has started');
  });
  recognition.addEventListener('error', (event: any) => {
    errorConnecting = event.error !== 'no-speech';
    console.error('speech error occured', event);
  });
  recognition.addEventListener('end', (event: any) => {
    console.log(
      'Speech recognition service disconnected, attempting to reconnect.'
    );
    if (errorConnecting) {
      // unexpected error, wait then try to reconnect
      delay(5000).then(() => {
        recognition.start();
      });
    } else {
      recognition.start();
    }
  });
  recognition.onresult = (res: any) => {
    const newTranscript: string =
      res.results[res.results.length - 1][0].transcript;
    const event: INotebookEvent = {
      eventData: {
        notebookName: notebookNameStore,
        location: window.location.toString(),
        transcript: newTranscript.trim()
      },
      eventName: SPEECH_DETECTED,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(event, null, 2));
    db.table('logs').add({
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      data: JSON.stringify(event, null, 2)
    });
    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
  };
  recognition.start();
}

/**
 * Initialization data for the KNICS_Jupyter_frontend extension.
 */

let db: Dexie;

const USER = UUID.uuid4();
const SESSION = UUID.uuid4();

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'KNICS_Jupyter_frontend:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    db = setupDB();
    console.log('JupyterLab extension KNICS_Jupyter_frontend is activated!');
    notebookTracker.widgetAdded.connect(onWidgetAdded, this);
    notebookTracker.activeCellChanged.connect(logActiveCell, this);
    NotebookActions.executed.connect(onCellExecutionEnded, this);
    NotebookActions.executionScheduled.connect(onCellExecutionBegin, this);
    setupPerpetualSpeechRecognition();
  }
};

let timeout = 0;

function setupDB(): Dexie {
  db = new Dexie('database');

  db.version(1).stores({
    logs: '++id, eventName, data'
  });

  return db;
}

function toCellData(cellModel: ICellModel): ICellData {
  return {
    cellId: cellModel.id,
    type: cellModel.type,
    metadata: cellModel.metadata,
    value: cellModel.value.text
  };
}

async function onCellExecutionBegin(
  emitter: any,
  args: { notebook: Notebook; cell: Cell<ICellModel> }
): Promise<void> {
  const parent: NotebookPanel = args?.notebook.parent as NotebookPanel;
  if (args?.cell.model && args.cell.model.type === 'code') {
    const model: ICodeCell = args.cell.model.toJSON() as ICodeCell;

    const event: INotebookEvent = {
      eventData: {
        cell: toCellData(args.cell.model),
        notebookName: parent.context.path,
        location: window.location.toString(),
        executionCount: model.execution_count
      },
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };

    console.log(CELL_EXECUTION_BEGIN_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table('logs').add({
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      data: JSON.stringify(event, null, 2)
    });
    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
  }
}

async function onCellExecutionEnded(
  emitter: any,
  args: {
    notebook: Notebook;
    cell: Cell<ICellModel>;
    success: boolean;
    error?: KernelError | null;
  }
): Promise<void> {
  const parent: NotebookPanel = args?.notebook.parent as NotebookPanel;
  if (args?.cell.model && args.cell.model.type === 'code') {
    const model: ICodeCell = args.cell.model.toJSON() as ICodeCell;
    const errors: IErrorData[] = model.outputs
      .map((element: IOutput): IErrorData => {
        if (element.output_type === 'error') {
          const error: IError = element as IError;
          return {
            errorName: error.ename,
            errorText: error.evalue,
            stackTrace: error.traceback
          };
        }
        return { errorName: '', errorText: '', stackTrace: [] };
      })
      .filter(value => {
        return value.errorName !== '';
      });

    const outputs: MultilineString[] = model.outputs
      .map((element: IOutput) => {
        if (element.output_type === 'stream') {
          return (element as IStream).text;
        } else {
          return [];
        }
      })
      .filter(value => {
        return value.length > 0;
      });

    const event: INotebookEvent = {
      eventData: {
        cell: toCellData(args.cell.model),
        notebookName: parent.context.path,
        location: window.location.toString(),
        output: outputs,
        executionCount: model.execution_count,
        errors: errors
      },
      eventName: CELL_EXECUTED_END_EVENT,
      session: SESSION,
      user: USER,
      timestamp: new Date().toISOString()
    };
    console.log(CELL_EXECUTED_END_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table('logs').add({
      eventName: CELL_EXECUTED_END_EVENT,
      data: JSON.stringify(event, null, 2)
    });

    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
  }
}

async function onWidgetAdded(
  emitter: INotebookTracker,
  args: NotebookPanel
): Promise<void> {
  args.content.modelContentChanged.connect(onModelContentChanged);
  const event: INotebookEvent = {
    eventData: {
      notebookName: args.context.path,
      location: window.location.toString()
    },
    user: USER,
    session: SESSION,
    timestamp: new Date().toISOString(),
    eventName: NOTEBOOK_OPENED_EVENT
  };
  console.log(NOTEBOOK_OPENED_EVENT);
  console.log(JSON.stringify(event, null, 2));
  await db.table('logs').add({
    eventName: NOTEBOOK_OPENED_EVENT,
    data: JSON.stringify(event, null, 2)
  });
  axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
}

async function onModelContentChanged(emitter: Notebook): Promise<void> {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(async () => {
    const parent: NotebookPanel = emitter.parent as NotebookPanel;
    const cells: ICellData[] = [];
    if (emitter.model?.cells) {
      for (let index = 0; index < emitter.model.cells.length; index++) {
        const cellModel: ICellModel = emitter.model.cells.get(index);
        cells.push(toCellData(cellModel));
      }
    }
    const event: INotebookEvent = {
      eventData: {
        notebookName: parent.context.path,
        location: window.location.toString(),
        cells: cells
      },
      eventName: NOTEBOOK_MODIFIED_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };
    console.log(NOTEBOOK_MODIFIED_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table('logs').add({
      eventName: NOTEBOOK_MODIFIED_EVENT,
      data: JSON.stringify(event, null, 2)
    });
    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
  }, 5000);
}

async function logActiveCell(
  emitter: INotebookTracker,
  args: Cell<ICellModel> | null
): Promise<void> {
  const parent: NotebookPanel = args?.parent?.parent as NotebookPanel;
  notebookNameStore = parent.context.path;
  if (args?.model) {
    const event: INotebookEvent = {
      eventData: {
        cell: toCellData(args?.model),
        notebookName: parent.context.path,
        location: window.location.toString()
      },
      eventName: CELL_SELECTED_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };
    console.log(CELL_SELECTED_EVENT);
    console.log(JSON.stringify(event, null, 2));
    await db.table('logs').add({
      eventName: CELL_SELECTED_EVENT,
      data: JSON.stringify(event, null, 2)
    });
    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)));
  }
}

export default plugin;
