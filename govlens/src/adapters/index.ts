export type { GovernanceAdapter } from "./interface.js";
export { detectFramework } from "./interface.js";
export { OZGovernorAdapter } from "./oz-governor.js";
export { GnosisSnapshotAdapter } from "./gnosis-snapshot.js";

import type { GovernanceAdapter } from "./interface.js";
import { OZGovernorAdapter } from "./oz-governor.js";
import { GnosisSnapshotAdapter } from "./gnosis-snapshot.js";

/**
 * All available governance adapters, ordered by priority.
 */
export function getAllAdapters(): GovernanceAdapter[] {
  return [
    new OZGovernorAdapter(),
    new GnosisSnapshotAdapter(),
  ];
}
