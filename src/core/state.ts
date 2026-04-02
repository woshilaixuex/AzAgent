export enum AgentState {
  Init = "INIT",
  Chat = "CHAT",
  Tool = "TOOL",
  Error = "ERROR",
  Output = "OUTPUT",
  End = "END",
}

export enum AgentStateEvent {
  Start = "START",
  NeedTool = "NEED_TOOL",
  ToolSucceeded = "TOOL_SUCCEEDED",
  ToolFailed = "TOOL_FAILED",
  ErrorHandled = "ERROR_HANDLED",
  Respond = "RESPOND",
  Finish = "FINISH",
  NextTurn = "NEXT_TURN",
  Reset = "RESET",
}

export interface StateTransitionRecord {
  from: AgentState;
  to: AgentState;
  event: AgentStateEvent;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface StateTransitionOptions {
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StateMachineSnapshot {
  current: AgentState;
  previous?: AgentState;
  history: StateTransitionRecord[];
}

const transitionMap: Readonly<Record<AgentState, ReadonlyMap<AgentStateEvent, AgentState>>> =
  {
    [AgentState.Init]: new Map([
      [AgentStateEvent.Start, AgentState.Chat],
      [AgentStateEvent.Reset, AgentState.Init],
    ]),
    [AgentState.Chat]: new Map([
      [AgentStateEvent.NeedTool, AgentState.Tool],
      [AgentStateEvent.Respond, AgentState.Output],
      [AgentStateEvent.Finish, AgentState.End],
      [AgentStateEvent.Reset, AgentState.Init],
    ]),
    [AgentState.Tool]: new Map([
      [AgentStateEvent.ToolSucceeded, AgentState.Chat],
      [AgentStateEvent.ToolFailed, AgentState.Error],
      [AgentStateEvent.Reset, AgentState.Init],
    ]),
    [AgentState.Error]: new Map([
      [AgentStateEvent.ErrorHandled, AgentState.Chat],
      [AgentStateEvent.Finish, AgentState.End],
      [AgentStateEvent.Reset, AgentState.Init],
    ]),
    [AgentState.Output]: new Map([
      [AgentStateEvent.NextTurn, AgentState.Chat],
      [AgentStateEvent.Finish, AgentState.End],
      [AgentStateEvent.Reset, AgentState.Init],
    ]),
    [AgentState.End]: new Map([[AgentStateEvent.Reset, AgentState.Init]]),
  };

export class InvalidStateTransitionError extends Error {
  public readonly state: AgentState;
  public readonly event: AgentStateEvent;

  constructor(state: AgentState, event: AgentStateEvent) {
    super(`Cannot transition from "${state}" with event "${event}".`);
    this.name = "InvalidStateTransitionError";
    this.state = state;
    this.event = event;
  }
}

export class StateMachine {
  private currentState: AgentState;
  private previousState?: AgentState;
  private readonly history: StateTransitionRecord[] = [];

  constructor(initialState: AgentState = AgentState.Init) {
    this.currentState = initialState;
  }

  public get state(): AgentState {
    return this.currentState;
  }

  public get previous(): AgentState | undefined {
    return this.previousState;
  }

  public can(event: AgentStateEvent): boolean {
    return transitionMap[this.currentState].has(event);
  }

  public getNextState(event: AgentStateEvent): AgentState | undefined {
    return transitionMap[this.currentState].get(event);
  }

  public transition(
    event: AgentStateEvent,
    options: StateTransitionOptions = {},
  ): AgentState {
    const nextState = this.getNextState(event);

    if (!nextState) {
      throw new InvalidStateTransitionError(this.currentState, event);
    }

    const record: StateTransitionRecord = {
      from: this.currentState,
      to: nextState,
      event,
      timestamp: new Date(),
    };

    if (options.reason) {
      record.reason = options.reason;
    }

    if (options.metadata) {
      record.metadata = options.metadata;
    }

    this.previousState = this.currentState;
    this.currentState = nextState;
    this.history.push(record);

    return this.currentState;
  }

  public start(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.Start, options);
  }

  public needTool(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.NeedTool, options);
  }

  public toolSucceeded(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.ToolSucceeded, options);
  }

  public toolFailed(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.ToolFailed, options);
  }

  public errorHandled(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.ErrorHandled, options);
  }

  public respond(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.Respond, options);
  }

  public finish(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.Finish, options);
  }

  public nextTurn(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.NextTurn, options);
  }

  public reset(options?: StateTransitionOptions): AgentState {
    return this.transition(AgentStateEvent.Reset, options);
  }

  public is(state: AgentState): boolean {
    return this.currentState === state;
  }

  public isTerminal(): boolean {
    return this.currentState === AgentState.End;
  }

  public getHistory(): StateTransitionRecord[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history.length = 0;
  }

  public snapshot(): StateMachineSnapshot {
    const snapshot: StateMachineSnapshot = {
      current: this.currentState,
      history: this.getHistory(),
    };

    if (this.previousState) {
      snapshot.previous = this.previousState;
    }

    return snapshot;
  }
}
