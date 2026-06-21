import type { TokenPermission } from "./types";

export const canDo = (
  permissions: TokenPermission[],
  module: string,
  action: string,
): boolean => {
  const perm = permissions.find((p) => p.module === module);
  if (!perm) return false;
  if (perm.actions === "FULL") return true;
  return Array.isArray(perm.actions) && perm.actions.includes(action);
};
