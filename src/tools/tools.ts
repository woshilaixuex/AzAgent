

export type ManagedToolSource = "local" | "skill" | "mcp" | "other";
export interface ManagedRuntimeTool {
  name: string;
  description: string;
  invoke(input: unknown): Promise<unknown>;
}

/**
 * @name 可托管工具
 * @description 具备转成 LangChain Tool 能力的对象
 */
export interface CanManaged<TTool extends ManagedRuntimeTool = ManagedRuntimeTool> {
  name: string;
  description: string;
  source: ManagedToolSource;
  toTool(): TTool;
}

/**
 * @name 被管理工具
 * @description 被管理工具
 */
export interface ManagedTool {
  name: string;
  description: string;
  source: ManagedToolSource;
  tool: ManagedRuntimeTool;
}

export function isManagedCollection(
  managed: CanManaged | readonly CanManaged[],
): managed is readonly CanManaged[] {
  return Array.isArray(managed);
}

export function toManagedTool(managed: CanManaged): ManagedTool {
  return {
    name: managed.name,
    description: managed.description,
    source: managed.source,
    tool: managed.toTool(),
  };
}

export function toTools(managed: CanManaged): ManagedTool;
export function toTools(managed: readonly CanManaged[]): ManagedTool[];
export function toTools(
  managed: CanManaged | readonly CanManaged[],
): ManagedTool | ManagedTool[] {
  if (isManagedCollection(managed)) {
    return managed.map((item) => toManagedTool(item));
  }

  return toManagedTool(managed);
}
