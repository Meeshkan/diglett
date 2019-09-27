import { ISerializedRequest } from "../types";
import { BatchSender } from "./request-sender";
import debug from "debug";
import { Either, either, isLeft } from "fp-ts/lib/Either";
import { array, zip } from "fp-ts/lib/Array";
import { readYaml } from "../utils";
import { TaskEither, map as mapTe, mapLeft } from "fp-ts/lib/TaskEither";
import { Task } from "fp-ts/lib/Task";

const debugLog = debug("api-hitter:bombard");

export interface ISerializedResponse {
  code: number;
}

export type RequestResponsePair = {
  req: ISerializedRequest;
  res: ISerializedResponse;
};

export type FailedRequest = {
  req: ISerializedRequest;
  err: Error;
};

export const fakeSendRequest = async (req: ISerializedRequest): Promise<ISerializedResponse> => {
  debugLog(`Faking sending request: ${JSON.stringify(req)}`);
  return Promise.resolve({ code: 200 });
};

export const bombardFp = (
  requests: ISerializedRequest[],
  config?: BombardOptions
): Task<{ failed: Array<FailedRequest>; succeeded: Array<RequestResponsePair> }> => {
  debugLog(`Sending ${requests.length} requests`);
  const sendRequest = (config && config.sendRequest) || fakeSendRequest;
  const batchSender = new BatchSender(sendRequest);
  const taskEithers: TaskEither<Error, ISerializedResponse>[] = batchSender.sendBatchFp(requests);
  const results: TaskEither<FailedRequest, RequestResponsePair>[] = taskEithers
    .map((taskEither, i) => mapLeft((e: Error) => ({ req: requests[i], err: e }))(taskEither))
    .map((taskEither, i) => mapTe((res: ISerializedResponse) => ({ req: requests[i], res }))(taskEither));

  // Super hacky way to collect results until I'm better at fp-ts :D
  // Should do some kind of traverse instead
  return () =>
    new Promise(async (resolve, reject) => {
      try {
        const eithers = await Promise.all(results.map(taskEither => taskEither()));

        const result = eithers.reduce(
          (acc, val) => {
            if (isLeft(val)) {
              return { ...acc, failed: acc.failed.concat(val.left) };
            }
            return { ...acc, succeeded: acc.succeeded.concat(val.right) };
          },
          { succeeded: [] as RequestResponsePair[], failed: [] as FailedRequest[] }
        );
        batchSender.stop();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        batchSender.stop();
      }
    });
};

interface BombardOptions {
  sendRequest?: (req: ISerializedRequest) => Promise<ISerializedResponse>;
}

export const bombard = async (
  requests: ISerializedRequest[],
  config?: BombardOptions
): Promise<RequestResponsePair[]> => {
  const results = await bombardFp(requests, config)();

  // TODO More graceful handling of successes and failures
  if (results.failed.length > 0) {
    throw Error(`Failed: ${results.failed.map(err => err.err.message).join(", ")}`);
  }

  return results.succeeded;
};

export const bombardFromFile = async (path: string): Promise<RequestResponsePair[]> => {
  const requests = readYaml(path);
  // TODO Validate requests
  return bombard(requests, {});
};

export default bombardFromFile;
