import { IUserRepository } from "../repositories/IUserRepository";

// Context object as per architecture rules
export class Context {
  public requestId: string | null = null;
  public userId: string | null = null

  constructor(
    public readonly app: AppContext
  ) {
  }
}

interface Repositories {
  userRepository: IUserRepository
}

type TxCallback = (r: Repositories) => void

type LoggerFn = (message: string, ...restArgs: any) => void

interface Logger {
  info: LoggerFn,
  error: LoggerFn,
  debug: LoggerFn
}

export interface AppContext extends Repositories {
  logger: Logger
  init(): Promise<void>
  shutdown(): Promise<void>
  transactionally: (cb: TxCallback) => void
  createRequestContext: () => Context
}