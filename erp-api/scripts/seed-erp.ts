import "dotenv/config";
import { seedSimulationData } from "./seed-simulation-data.js";
import { poolConnection } from "../src/db/setup.js";

seedSimulationData()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await poolConnection.end();
  });
