import gen, { renderObject } from "../../../lib/requests";
import * as fs from "fs";
import * as jsYaml from "js-yaml";
import * as path from "path";

const PETSTORE_TEMPLATES = jsYaml.safeLoad(
  fs.readFileSync(path.join(__dirname, "..", "..", "..", "..", "templates", "petstore-templates.yaml")).toString()
);

describe("Generating requests", () => {
  const requests = gen(PETSTORE_TEMPLATES);
  it("should generate three requests", () => {
    expect(requests).toHaveLength(3);
  });
  it("should generate request when there are no values to fill in", () => {
    const req = requests[0];
    expect(req).toHaveProperty("host", "petstore.swagger.io");
  });
  it("should generate request when there's post request body", () => {
    const req = requests[1];
    expect(req).toHaveProperty("body");
    const body = JSON.parse(req.body as any);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("name");
  });
  it("should generate request when there are parameters to fill in", () => {
    const req = requests[2];
    expect(req).toHaveProperty("host", "petstore.swagger.io");
    expect(req).toHaveProperty("path", expect.stringMatching(/^\/v1\/pets\/\w+$/));
    // Zoom in more
    const generatedValue = req.path.split("/")[3];
    expect(generatedValue.length).toBeGreaterThan(0);
  });
});

describe("Rendering object", () => {
  it("renders nested object", () => {
    const testObj = {
      number: 1,
      string: "something",
      obj: {
        string: "Hello {{ name }}",
      },
    };
    const name = "Jick";
    const rendered = renderObject(testObj, { name });
    expect(rendered).toEqual({
      number: 1,
      string: "something",
      obj: {
        string: `Hello ${name}`,
      },
    });
  });
});
