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
import axios from 'axios';

/**
 * Supported Jupyter Lab events in knic-jupyter
 */

const JUPYTER_LOADED_EVENT = 'JUPYTER_LOADED';
const NOTEBOOK_OPENED_EVENT = 'NOTEBOOK_OPENED';
const NOTEBOOK_LOADED_EVENT = 'NOTEBOOK_LOADED';
const CELL_SELECTED_EVENT = 'CELL_SELECTED';
const NOTEBOOK_MODIFIED_EVENT = 'NOTEBOOK_MODIFIED';
const CELL_EXECUTION_BEGIN_EVENT = 'CELL_EXECUTION_BEGIN';
const CELL_EXECUTED_END_EVENT = 'CELL_EXECUTION_END';
const CURRENT_ACTIVE_NOTEBOOK = 'CURRENT_ACTIVE_NOTEBOOK';

// CELL MODIFIED EVENT
const CELL_MODIFIED_EVENT = 'CELL_MODIFIED';
const CELL_MODIFIED_EVENT_TIMEOUT = 1000; // 1 second
const CELL_MODIFIED_EVENT_INTERVAL = 3000; // 3 seconds
let CELL_MODIFIED_EVENT_INTERVAL_ID: any;
let CELL_MODIFIED_EVENT_TIMEOUT_ID: any;

/**
 * Initialization data for knic-jupyter
 */
const USER = new URLSearchParams(window.location.search).get('userid');
const SESSION = new URLSearchParams(window.location.search).get('sessionid');
const ENGINE_URL = new URLSearchParams(window.location.search).get('engineurl');
const SERVER_ENDPOINT = `${ENGINE_URL}/user/${USER}/event`;

let ENUMERATION = 0;
let NOTEBOOK_NAME: string = '';
let NOTEBOOK_SESSION = UUID.uuid4();

let ORIGINAL_CELL_DATA: any[] = [];

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

interface IJupyterLoaded {
  location: string;
}

interface ICellSelected extends IEventData {
  cell: ICellData;
}

interface ICellModifiedExecuted extends IEventData {
  cell: ICellData;
  isCellModified: boolean;
}

interface ICellModified extends IEventData {
  cell: ICellData;
  changeEvents: ICellData[];
}

interface INotebookModified extends IEventData {
  cells: ICellData[];
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
  user: string | null;
  session: string | null;
  timestamp: string;
  eventName: string;
  enumeration: number;
  notebookSession: string;
  eventData:
    | IEventData
    | IJupyterLoaded
    | INotebookModified
    | ICellExecutionBegin
    | ICellExecutionEnded
    | ICellSelected
    | ICellModifiedExecuted
    | ICellModified;
}

let notebookJustOpened: boolean = false;
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'knic-jupyter:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    // Log jupyter loaded event
    onJupyterLoaded();

    notebookTracker.widgetAdded.connect(onWidgetAdded, this);
    notebookTracker.activeCellChanged.connect(logActiveCell, this);
    notebookTracker.currentChanged.connect(logCurrentActiveNotebook, this);
    NotebookActions.executed.connect(onCellExecutionEnded, this);
    NotebookActions.executionScheduled.connect(onCellExecutionBegin, this);
  }
};

let timeout: NodeJS.Timeout | undefined = undefined;

function toCellData(cellModel: ICellModel): ICellData {
  return {
    cellId: cellModel.id,
    type: cellModel.type,
    metadata: cellModel.metadata,
    value: cellModel.value.text
  };
}

function isCellModified(cellDataExecuted: ICellData): boolean {
  if (
    ORIGINAL_CELL_DATA.some(
      e => e.value.trim() === cellDataExecuted.value.trim()
    )
  ) {
    return false;
  } else {
    return true;
  }
}

async function onCellExecutionBegin(
  emitter: any,
  args: { notebook: Notebook; cell: Cell<ICellModel> }
): Promise<void> {
  if (args?.cell.model && args.cell.model.type === 'code') {
    const model: ICodeCell = args.cell.model.toJSON() as ICodeCell;

    const event: INotebookEvent = {
      eventData: {
        cell: toCellData(args.cell.model),
        notebookName: NOTEBOOK_NAME,
        location: window.location.toString(),
        executionCount: model.execution_count
      },
      enumeration: ENUMERATION++,
      notebookSession: NOTEBOOK_SESSION,
      eventName: CELL_EXECUTION_BEGIN_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };
    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
      headers: { 'Content-Type': 'application/json' }
    });
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
        notebookName: NOTEBOOK_NAME,
        location: window.location.toString(),
        output: outputs,
        executionCount: model.execution_count,
        errors: errors
      },
      enumeration: ENUMERATION++,
      notebookSession: NOTEBOOK_SESSION,
      eventName: CELL_EXECUTED_END_EVENT,
      session: SESSION,
      user: USER,
      timestamp: new Date().toISOString()
    };

    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function onWidgetAdded(
  emitter: INotebookTracker,
  args: NotebookPanel
): Promise<void> {
  notebookJustOpened = true;
  args.content.modelContentChanged.connect(onModelContentChanged);
  ENUMERATION = 0;
  NOTEBOOK_SESSION = UUID.uuid4();
  NOTEBOOK_NAME = args.context.path;
  const event: INotebookEvent = {
    eventData: {
      notebookName: NOTEBOOK_NAME,
      location: window.location.toString()
    },
    user: USER,
    session: SESSION,
    enumeration: ENUMERATION++,
    notebookSession: NOTEBOOK_SESSION,
    timestamp: new Date().toISOString(),
    eventName: NOTEBOOK_OPENED_EVENT
  };
  axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function onJupyterLoaded(): Promise<void> {
  ENUMERATION = 0;
  NOTEBOOK_SESSION = UUID.uuid4();
  const event: INotebookEvent = {
    eventData: {
      location: window.location.toString()
    },
    user: USER,
    session: SESSION,
    enumeration: ENUMERATION++,
    notebookSession: NOTEBOOK_SESSION,
    timestamp: new Date().toISOString(),
    eventName: JUPYTER_LOADED_EVENT
  };
  axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function onModelContentChanged(emitter: Notebook): Promise<void> {
  if (notebookJustOpened) {
    notebookJustOpened = false;
    setTimeout(async () => {
      const cells: ICellData[] = [];
      if (emitter.model?.cells) {
        for (let index = 0; index < emitter.model.cells.length; index++) {
          const cellModel: ICellModel = emitter.model.cells.get(index);
          cells.push(toCellData(cellModel));
          ORIGINAL_CELL_DATA.push(toCellData(cellModel));
        }
      }

      const event: INotebookEvent = {
        eventData: {
          notebookName: NOTEBOOK_NAME,
          location: window.location.toString(),
          cells: cells
        },
        enumeration: ENUMERATION++,
        notebookSession: NOTEBOOK_SESSION,
        eventName: NOTEBOOK_LOADED_EVENT,
        user: USER,
        session: SESSION,
        timestamp: new Date().toISOString()
      };
      axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }, 1000);
  } else {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(async () => {
      const cells: ICellData[] = [];
      if (emitter.model?.cells) {
        for (let index = 0; index < emitter.model.cells.length; index++) {
          const cellModel: ICellModel = emitter.model.cells.get(index);
          cells.push(toCellData(cellModel));
          ORIGINAL_CELL_DATA.push(toCellData(cellModel));
        }
      }
      const event: INotebookEvent = {
        eventData: {
          notebookName: NOTEBOOK_NAME,
          location: window.location.toString(),
          cells: cells
        },
        enumeration: ENUMERATION++,
        notebookSession: NOTEBOOK_SESSION,
        eventName: NOTEBOOK_MODIFIED_EVENT,
        user: USER,
        session: SESSION,
        timestamp: new Date().toISOString()
      };
      axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }, 5000);
  }
}

async function logCurrentActiveNotebook(
  emitter: INotebookTracker,
  args: NotebookPanel | null
): Promise<void> {
  NOTEBOOK_SESSION = UUID.uuid4();
  NOTEBOOK_NAME = args?.context.path ? args?.context.path : '';
  const event: INotebookEvent = {
    eventData: {
      notebookName: NOTEBOOK_NAME,
      location: window.location.toString()
    },
    user: USER,
    session: SESSION,
    enumeration: ENUMERATION++,
    notebookSession: NOTEBOOK_SESSION,
    timestamp: new Date().toISOString(),
    eventName: CURRENT_ACTIVE_NOTEBOOK
  };
  axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function logActiveCell(
  emitter: INotebookTracker,
  args: Cell<ICellModel> | null
): Promise<void> {
  if (args?.model) {
    const cellData: ICellData = toCellData(args?.model);
    const event: INotebookEvent = {
      eventData: {
        cell: cellData,
        notebookName: NOTEBOOK_NAME,
        location: window.location.toString()
      },
      enumeration: ENUMERATION++,
      notebookSession: NOTEBOOK_SESSION,
      eventName: CELL_SELECTED_EVENT,
      user: USER,
      session: SESSION,
      timestamp: new Date().toISOString()
    };

    axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
      headers: { 'Content-Type': 'application/json' }
    });

    // connect onContentChanged listener to the cell model
    args?.model.contentChanged.connect(logDisplayChange);
  }
}

async function logDisplayChange(args: ICellModel | null): Promise<void> {
  if (args) {
    const cellData: ICellData = toCellData(args);

    // check if the cell was modified
    if (isCellModified(cellData)) {
      // setup periodic updates for the cell modified events
      if (!CELL_MODIFIED_EVENT_INTERVAL_ID) {
        CELL_MODIFIED_EVENT_INTERVAL_ID = setInterval(
          cellData => {
            // check if the cell was modified
            if (isCellModified(cellData)) {
              const event: INotebookEvent = {
                eventData: {
                  cell: cellData,
                  notebookName: NOTEBOOK_NAME,
                  location: window.location.toString(),
                  changeEvents: [cellData]
                },
                enumeration: ENUMERATION++,
                notebookSession: NOTEBOOK_SESSION,
                eventName: CELL_MODIFIED_EVENT,
                user: USER,
                session: SESSION,
                timestamp: new Date().toISOString()
              };

              axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          },
          CELL_MODIFIED_EVENT_INTERVAL,
          cellData
        );
      }

      clearTimeout(CELL_MODIFIED_EVENT_TIMEOUT_ID);
      CELL_MODIFIED_EVENT_TIMEOUT_ID = setTimeout(() => {
        // clear periodic updates for the cell modified event
        clearInterval(CELL_MODIFIED_EVENT_INTERVAL_ID);
        CELL_MODIFIED_EVENT_INTERVAL_ID = null;

        const event: INotebookEvent = {
          eventData: {
            cell: cellData,
            notebookName: NOTEBOOK_NAME,
            location: window.location.toString(),
            changeEvents: [cellData]
          },
          enumeration: ENUMERATION++,
          notebookSession: NOTEBOOK_SESSION,
          eventName: CELL_MODIFIED_EVENT,
          user: USER,
          session: SESSION,
          timestamp: new Date().toISOString()
        };

        axios.post(SERVER_ENDPOINT, encodeURI(JSON.stringify(event)), {
          headers: { 'Content-Type': 'application/json' }
        });
      }, CELL_MODIFIED_EVENT_TIMEOUT);
    }
  }
}

export default plugin;
