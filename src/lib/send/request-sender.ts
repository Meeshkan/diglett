import { ISerializedRequest } from "../types";
import { ISerializedResponse } from ".";
import debug from "debug";
import fetch, { Headers } from "cross-fetch";

const debugLog = debug("diglett:request-sender");

export const buildHeaders = (request: ISerializedRequest): Headers => {
  const headers = new Headers();
  if (typeof request.headers !== "undefined") {
    Object.entries(request.headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        headers.append(key, value);
      } else if (Array.isArray(value)) {
        headers.append(key, value.join(","));
      }
    });
  }
  return headers;
};

export const prepareFetch = (request: ISerializedRequest): [RequestInfo, RequestInit] => {
  const url = `${request.protocol}://${request.host}${request.path}`;
  const headers = buildHeaders(request);
  const stringBody = typeof request.body === "object" ? JSON.stringify(request.body) : request.body;
  return [url, { method: request.method, headers, body: stringBody }];
};

export const sendRequest = async (request: ISerializedRequest): Promise<ISerializedResponse> => {
  const [url, init] = prepareFetch(request);
  try {
    debugLog("Sending request", JSON.stringify(url), JSON.stringify(init));
    const response = await fetch(url, init);
    const statusCode = response.status;
    const text = await response.text();
    return {
      code: statusCode,
      body: text,
    };
  } catch (err) {
    debugLog("Failed sending request", err);
    throw err;
  }
};

export const fakeSendRequest = async (req: ISerializedRequest): Promise<ISerializedResponse> => {
  debugLog(`Faking sending request: ${JSON.stringify(req)}`);
  return Promise.resolve({ code: 200, body: '{ "message": "ok" }' });
};