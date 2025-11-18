import type { Benchmark } from "./types";
import { ExactMatchGrader, ContainsGrader } from "./graders";

export const models = [
    // Proprietary
    "openai/gpt-5",
    "openai/gpt-5-codex",
    "openai/gpt-5.1",
    "openai/gpt-5.1-codex",
    "openai/gpt-5.1-codex-mini",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-haiku-4.5",
    "google/gemini-3-pro-preview",
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "x-ai/grok-4-fast",
    "x-ai/grok-code-fast-1",

    // Open
    "openai/gpt-oss-120b",
    "qwen/qwen3-coder",
    "z-ai/glm-4.6",
    "z-ai/glm-4.5-air",
    "deepseek/deepseek-v3.1-terminus",
    "google/gemma-3-27b-it",
    "minimax/minimax-m2:free",
    "inclusionai/ring-1t"
];

const promptHeader = "You are being assessed on your knowledge of Minestom, which is a Java library which allows you to create custom Minecraft servers.\n"
    + "You may also be quizzed on Adventure, which is a library providing useful structs for Minecraft development.\n"
    + "IMPORTANT: Do not use any Markdown formatting (no backticks, no code blocks, no ``` symbols). Reply with plain text only.\n";

const imports = [
    "net.kyori.adventure.audience.Audience",
    "net.kyori.adventure.key.Key",
    "net.kyori.adventure.nbt.CompoundBinaryTag",
    "net.kyori.adventure.text.Component",
    "net.kyori.adventure.text.minimessage.MiniMessage",
    "net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer",
    "net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer",
    "net.minestom.server.MinecraftServer",
    "net.minestom.server.command.builder.Command",
    "net.minestom.server.component.DataComponents",
    "net.minestom.server.entity.EntityCreature",
    "net.minestom.server.entity.Player",
    "net.minestom.server.entity.metadata.display.TextDisplayMeta",
    "net.minestom.server.event.EventListener",
    "net.minestom.server.event.inventory.InventoryPreClickEvent",
    "net.minestom.server.event.player.AsyncPlayerConfigurationEvent",
    "net.minestom.server.event.player.PlayerSpawnEvent",
    "net.minestom.server.instance.InstanceContainer",
    "net.minestom.server.instance.anvil.AnvilLoader",
    "net.minestom.server.item.ItemStack",
    "net.minestom.server.inventory.Inventory",
    "net.minestom.server.scoreboard.Sidebar",
    "net.minestom.server.tag.Tag",
];

const importBenchmarks: Benchmark[] = imports.map((importPath) => {
    const className = importPath.split(".").pop() || "";
    return {
        id: importPath,
        prompt: promptHeader + `What is the import for the class ${className}? Reply with only the fully qualified name.`,
        grader: new ExactMatchGrader(importPath),
    };
});

const otherBenchmarks: Benchmark[] = [
    {
        id: "enable-authentication",
        prompt:
            promptHeader +
            `How do I enable authentication on Minestom? Reply with only a single line of Java code. Note: This was recently changed from MojangAuth.init().`,
        grader: new ContainsGrader("MinecraftServer.init(new Auth.Online())"),
    },
    {
        id: "configuration-phase-event",
        prompt:
            promptHeader +
            `What is the event when a player's client enters the configuration phase? Reply with only the class name.`,
        grader: new ContainsGrader("AsyncPlayerConfigurationEvent"),
    },
    {
        id: "gamemode-change-event",
        prompt:
            promptHeader +
            `In which event is it safe to change the player's game mode? Reply with only the class name.`,
        grader: new ContainsGrader("PlayerSpawnEvent"),
    },
    {
        id: "motd-event",
        prompt:
            promptHeader +
            `Which event can be used to customize the server MOTD? Reply with only the class name.`,
        grader: new ContainsGrader("ServerListPingEvent"),
    },
    {
        id: "player-head-skin-component",
        prompt:
            promptHeader +
            `Which item component can be used to add a skin to a player head item? Reply with only the component name (e.g. DataComponents.SOMETHING).`,
        grader: new ContainsGrader("DataComponents.PROFILE"),
    },
    {
        id: "enable-lighting",
        prompt:
            promptHeader + `How do I enable lighting? Reply with only a single line of Java code.`,
        grader: new ContainsGrader("LightingChunk::new"),
    },
    {
        id: "join-components-method",
        prompt:
            promptHeader +
            `Which Adventure method can be used to join two components together without style bleeding? Reply with only the method name. (Hint: it does not involve "append")`,
        grader: new ContainsGrader("textOfChildren"),
    },
    {
        id: "blockvec",
        prompt: promptHeader + "Which class extending Point is best used for storing block positions? Reply with only the class name.",
        grader: new ContainsGrader("BlockVec")
    },
    {
        id: "holograms",
        prompt: promptHeader + "Which entity type is best used for creating holograms/floating text? Reply with only the entity type. (e.g. EntityType.ENTITY_NAME)",
        grader: new ContainsGrader("TEXT_DISPLAY")
    }
];

export const benchmarks: Benchmark[] = [...importBenchmarks, ...otherBenchmarks];
