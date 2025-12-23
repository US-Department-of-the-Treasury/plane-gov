import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { TPowerKCommandConfig, TPowerKContext, TPowerKCommandGroup } from "./types";

// Enable Immer MapSet plugin before creating stores that use Map/Set
enableMapSet();

export interface IPowerKCommandRegistry {
  // observables
  commands: Map<string, TPowerKCommandConfig>;
  // Registration
  register(command: TPowerKCommandConfig): void;
  registerMultiple(commands: TPowerKCommandConfig[]): void;
  // Retrieval
  getCommand(id: string): TPowerKCommandConfig | undefined;
  getAllCommands(): TPowerKCommandConfig[];
  getAllCommandsWithShortcuts(): TPowerKCommandConfig[];
  getVisibleCommands(ctx: TPowerKContext): TPowerKCommandConfig[];
  getCommandsByGroup(group: TPowerKCommandGroup, ctx: TPowerKContext): TPowerKCommandConfig[];
  // Shortcut lookup
  getShortcutMap: (ctx: TPowerKContext) => Map<string, string>; // key -> command id
  getKeySequenceMap: (ctx: TPowerKContext) => Map<string, string>; // sequence -> command id
  getModifierShortcutMap: (ctx: TPowerKContext) => Map<string, string>; // modifier shortcut -> command id
  findByShortcut(ctx: TPowerKContext, key: string): TPowerKCommandConfig | undefined;
  findByKeySequence(ctx: TPowerKContext, sequence: string): TPowerKCommandConfig | undefined;
  findByModifierShortcut(ctx: TPowerKContext, shortcut: string): TPowerKCommandConfig | undefined;
  // Utility
  clear(): void;
}

// ============================================================================
// Zustand Store
// ============================================================================

interface PowerKCommandRegistryState {
  commands: Map<string, TPowerKCommandConfig>;
}

interface PowerKCommandRegistryActions {
  register: (command: TPowerKCommandConfig) => void;
  registerMultiple: (commands: TPowerKCommandConfig[]) => void;
  clear: () => void;
}

type PowerKCommandRegistryStore = PowerKCommandRegistryState & PowerKCommandRegistryActions;

export const usePowerKCommandRegistry = create<PowerKCommandRegistryStore>()(
  immer((set, get) => ({
    // State
    commands: new Map<string, TPowerKCommandConfig>(),

    // Actions
    register: (command) => {
      set((state) => {
        state.commands.set(command.id, command);
      });
    },

    registerMultiple: (commands) => {
      set((state) => {
        commands.forEach((command) => {
          state.commands.set(command.id, command);
        });
      });
    },

    clear: () => {
      set((state) => {
        state.commands.clear();
      });
    },
  }))
);

// ============================================================================
// Helper Functions
// ============================================================================

function isCommandVisible(command: TPowerKCommandConfig, ctx: TPowerKContext): boolean {
  // Check custom visibility function
  if (command.isVisible && !command.isVisible(ctx)) {
    return false;
  }

  // Check context type filtering
  if ("contextType" in command) {
    // Command requires specific context
    if (!ctx.activeContext || ctx.activeContext !== command.contextType) {
      return false;
    }

    if (!ctx.shouldShowContextBasedActions) {
      return false;
    }
  }

  return true;
}

function getVisibleCommands(commands: Map<string, TPowerKCommandConfig>, ctx: TPowerKContext): TPowerKCommandConfig[] {
  return Array.from(commands.values()).filter((command) => isCommandVisible(command, ctx));
}

function getCommandsByGroup(
  commands: Map<string, TPowerKCommandConfig>,
  group: TPowerKCommandGroup,
  ctx: TPowerKContext
): TPowerKCommandConfig[] {
  return getVisibleCommands(commands, ctx).filter((command) => command.group === group);
}

function getShortcutMap(commands: Map<string, TPowerKCommandConfig>, ctx: TPowerKContext): Map<string, string> {
  const shortcutMap = new Map<string, string>();
  getVisibleCommands(commands, ctx).forEach((command) => {
    if (command.shortcut) {
      shortcutMap.set(command.shortcut.toLowerCase(), command.id);
    }
  });
  return shortcutMap;
}

function getKeySequenceMap(commands: Map<string, TPowerKCommandConfig>, ctx: TPowerKContext): Map<string, string> {
  const keySequenceMap = new Map<string, string>();
  getVisibleCommands(commands, ctx).forEach((command) => {
    if (command.keySequence) {
      keySequenceMap.set(command.keySequence.toLowerCase(), command.id);
    }
  });
  return keySequenceMap;
}

function getModifierShortcutMap(
  commands: Map<string, TPowerKCommandConfig>,
  ctx: TPowerKContext
): Map<string, string> {
  const modifierShortcutMap = new Map<string, string>();
  getVisibleCommands(commands, ctx).forEach((command) => {
    if (command.modifierShortcut) {
      modifierShortcutMap.set(command.modifierShortcut.toLowerCase(), command.id);
    }
  });
  return modifierShortcutMap;
}

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

/**
 * Stores commands and provides lookup by shortcuts, search, etc.
 */
export class PowerKCommandRegistry implements IPowerKCommandRegistry {
  private get state() {
    return usePowerKCommandRegistry.getState();
  }

  // ============================================================================
  // State Access
  // ============================================================================

  get commands() {
    return this.state.commands;
  }

  // ============================================================================
  // Registration
  // ============================================================================

  register: IPowerKCommandRegistry["register"] = (command) => {
    this.state.register(command);
  };

  registerMultiple: IPowerKCommandRegistry["registerMultiple"] = (commands) => {
    this.state.registerMultiple(commands);
  };

  // ============================================================================
  // Retrieval
  // ============================================================================

  getCommand: IPowerKCommandRegistry["getCommand"] = (id) => this.state.commands.get(id);

  getAllCommands: IPowerKCommandRegistry["getAllCommands"] = () => Array.from(this.state.commands.values());

  getAllCommandsWithShortcuts: IPowerKCommandRegistry["getAllCommandsWithShortcuts"] = () =>
    Array.from(this.state.commands.values()).filter(
      (command) => command.shortcut || command.keySequence || command.modifierShortcut
    );

  getVisibleCommands: IPowerKCommandRegistry["getVisibleCommands"] = (ctx) =>
    getVisibleCommands(this.state.commands, ctx);

  getCommandsByGroup: IPowerKCommandRegistry["getCommandsByGroup"] = (group, ctx) =>
    getCommandsByGroup(this.state.commands, group, ctx);

  // ============================================================================
  // Shortcut Lookup
  // ============================================================================

  getShortcutMap: IPowerKCommandRegistry["getShortcutMap"] = (ctx) => getShortcutMap(this.state.commands, ctx);

  getKeySequenceMap: IPowerKCommandRegistry["getKeySequenceMap"] = (ctx) => getKeySequenceMap(this.state.commands, ctx);

  getModifierShortcutMap: IPowerKCommandRegistry["getModifierShortcutMap"] = (ctx) =>
    getModifierShortcutMap(this.state.commands, ctx);

  findByShortcut: IPowerKCommandRegistry["findByShortcut"] = (ctx, key) => {
    const commandId = getShortcutMap(this.state.commands, ctx).get(key.toLowerCase());
    return commandId ? this.state.commands.get(commandId) : undefined;
  };

  findByKeySequence: IPowerKCommandRegistry["findByKeySequence"] = (ctx, sequence) => {
    const commandId = getKeySequenceMap(this.state.commands, ctx).get(sequence.toLowerCase());
    return commandId ? this.state.commands.get(commandId) : undefined;
  };

  findByModifierShortcut: IPowerKCommandRegistry["findByModifierShortcut"] = (ctx, shortcut) => {
    const commandId = getModifierShortcutMap(this.state.commands, ctx).get(shortcut.toLowerCase());
    return commandId ? this.state.commands.get(commandId) : undefined;
  };

  // ============================================================================
  // Utility
  // ============================================================================

  clear: IPowerKCommandRegistry["clear"] = () => {
    this.state.clear();
  };
}
