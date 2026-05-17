import path from "node:path";

export const repoRoot = () =>
  process.env.PORTFOLIO_ROOT?.trim() || path.resolve(__dirname, "../../../..");
