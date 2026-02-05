/**
 * Central path resolution module — runtime-agnostic (Bun + Node.js)
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = join(__dirname, "../..");

export const paths = {
  contractsJson: join(PROJECT_ROOT, "scripts/mainnet/contracts.json"),
  agendasJson: join(PROJECT_ROOT, "scripts/mainnet/agendas.json"),
  contractsSrc: join(PROJECT_ROOT, "contracts/src"),
  contractsOut: join(PROJECT_ROOT, "contracts/out"),
  storageLayouts: join(PROJECT_ROOT, "scripts/storage/layouts"),
};
