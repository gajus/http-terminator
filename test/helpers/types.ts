import type {
  Server,
} from 'http';

type ServerResponse = {
  end: (body: string) => void,
  write: (body: string) => void,
};

type RequestHandler = (serverResponse: ServerResponse) => void;

type TestServerType = {
  readonly getConnections: () => Promise<number>,
  readonly port: number,
  readonly server: Server,
  readonly stop: () => Promise<void>,
  readonly url: string,
};

export type TestServerFactory = (requestHandler: RequestHandler) => Promise<TestServerType>;
