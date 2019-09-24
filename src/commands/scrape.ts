import chalk from "chalk";
import { Command, flags } from "@oclif/command";
import scrape from "../lib/scrape";

export default class Scrape extends Command {
  static description = "Scrape API based on OpenAPI specification";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    config: flags.string({ char: "c", description: "Path to configuration JSON", default: "scrape-config.yaml" }),
    // flag with no value (-f, --force)
    force: flags.boolean({ char: "f" }),
  };

  static args = [{ name: "openapi", description: "Path to OpenAPI specification", required: true }];

  async run() {
    const { args, flags } = this.parse(Scrape);

    const openapi = args.openapi;
    const config = flags.config;
    this.log(
      `Reading from file "${chalk.bold.magenta(openapi)}" with configuration from "${chalk.bold.magenta(config)}"`
    );

    const scrapeResult = scrape(openapi, config);

    this.log(`Result: ${JSON.stringify(scrapeResult)}`);
  }
}
