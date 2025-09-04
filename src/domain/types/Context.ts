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

export interface AppContext extends Repositories {
  init(): Promise<void>
  shutdown(): Promise<void>
  transactionally: (cb: TxCallback) => void
  createRequestContext: () => Context
}