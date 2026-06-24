export const canDo = (
  modules: Record<string, string[]>,
  module: string,
  action: string,
): boolean => {
  const actions = modules[module];
  if (!actions) return false;
  return actions.includes(action);
};
