import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync } from "node:child_process";

export default function (pi: ExtensionAPI) {
  let isFirstTurn = true;

  pi.on("session_start", async (_event, _ctx) => {
    isFirstTurn = true;
  });

  pi.on("agent_end", async (_event, _ctx) => {
    isFirstTurn = false;
  });

  pi.registerTool({
    name: "tmux_rename_window",
    label: "Rename Tmux Window",
    description:
      "Rename the current tmux window to a short label reflecting the conversation topic.",
    promptSnippet: "Rename the current tmux window to match the conversation topic",
    parameters: Type.Object({
      label: Type.String({
        description: "Short 2-4 word label (e.g. 'debug zsh config', 'ansible homebrew task')",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      if (!process.env.TMUX) {
        return {
          content: [{ type: "text", text: "Not in a tmux session — skipping rename." }],
        };
      }

      try {
        const label = params.label.replace(/"/g, '\\"');
        execSync(`tmux rename-window "${label}"`, { stdio: "pipe" });
        return {
          content: [{ type: "text", text: `Renamed tmux window to: ${params.label}` }],
          details: { label: params.label },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Failed to rename tmux window: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  pi.on("before_agent_start", async (event, _ctx) => {
    if (!process.env.TMUX) return;

    const instruction = isFirstTurn
      ? `\n\n## Tmux Window Naming\n\nYou have a \`tmux_rename_window\` tool. Call it on your FIRST response with a short (2-4 word) label reflecting the conversation topic (e.g. "debug zsh config", "ansible homebrew task", "git rebase help"). Also call it if the topic shifts significantly mid-session. Do not rename on every response.`
      : `\n\n## Tmux Window Naming\n\nYou have a \`tmux_rename_window\` tool. Call it if the conversation topic has shifted significantly from the current window name.`;

    return {
      systemPrompt: event.systemPrompt + instruction,
    };
  });
}
