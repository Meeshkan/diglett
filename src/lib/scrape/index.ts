import chalk from "chalk";
import debug from "debug";
import * as fs from "fs";
import { flatMap } from "lodash";
import * as path from "path";
import * as jsYaml from "js-yaml";
import { isOpenAPIObject, OpenAPIObject, Operation, PathItem, Parameter, RequestBody } from "loas3/dist/generated/full";
import * as types from "./types";

interface ScrapeResult {}

/**
 * A template for creating requests
 */
type RequestOperation = {
  method: types.HTTPMethod;
  path: string;
  body?: RequestBody;
  parameters: Array<Parameter>;
};

const debugLog = debug("api-client:scrape");

function parseRequest(op: {
  name: types.HTTPMethod;
  operation: Operation;
  pathItem: PathItem;
  pathName: string;
}): RequestOperation {
  const parameters = (op.pathItem.parameters || []).concat(...(op.operation.parameters || [])) as Parameter[]; // TODO References
  const requestBody = op.operation.requestBody;
  return {
    body: requestBody as RequestBody, // TODO References
    path: op.pathName,
    method: op.name,
    parameters,
  };
}

const extractOpsForPath = ({ pathItem, pathName }: { pathItem: PathItem; pathName: string }): RequestOperation[] => {
  const ops = Object.keys(pathItem);

  if (ops.length === 0) {
    debugLog(`No operations`);
    return [];
  }
  const operations = types.RESTMethodTypes.map(opName => ({ name: opName, operation: pathItem[opName] })).filter(
    op => typeof op.operation !== "undefined"
  ) as { name: types.HTTPMethod; operation: Operation }[];

  debugLog("Operations", operations);

  return operations.map(op => parseRequest({ ...op, pathItem, pathName }));
};

const extractOps = (openapi: OpenAPIObject): RequestOperation[] => {
  const serverUrls = (openapi.servers && openapi.servers.map(value => value.url)) || [];

  if (serverUrls.length === 0) {
    throw Error(`No servers in specification`);
  }

  const pathNames = Object.keys(openapi.paths);

  if (pathNames.length === 0) {
    throw Error(`No paths in specification`);
  }

  debugLog(`Found paths: ${pathNames.join(", ")}`);

  const pathOps = flatMap(pathNames, pathName => extractOpsForPath({ pathName, pathItem: openapi.paths[pathName] }));

  return pathOps;
};

const readOpenAPI = (openapiPath: string): OpenAPIObject => {
  const fullPath = path.resolve(process.cwd(), openapiPath);

  if (!fs.existsSync(fullPath)) {
    throw Error(`File not found: ${chalk.bold.magenta(fullPath)}`);
  }

  const extension = path.extname(fullPath);

  if (!/ya?ml/.test(extension)) {
    throw Error(`Found extension ${extension}, expected y(a)ml.`);
  }

  const content = fs.readFileSync(fullPath, { encoding: "utf-8" });

  const parsed = jsYaml.safeLoad(content);

  if (!isOpenAPIObject(parsed)) {
    throw Error(`Not an OpenAPI object`);
  }

  return parsed;
};

const scrape = async (openapiPath: string, config: any): Promise<ScrapeResult[]> => {
  const openapi = readOpenAPI(openapiPath);
  debugLog("Got OpenAPI", JSON.stringify(openapi));

  const operations = extractOps(openapi);

  return operations;
};

export default scrape;
