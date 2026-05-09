import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync } from "node:child_process";

function getCurrentWindowName(): string | null {
  try {
    return execSync("tmux display-message -p '#W'", { stdio: "pipe" })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export default function (pi: ExtensionAPI) {
  let isFirstTurn = true;

  pi.on("session_start", async (event, _ctx) => {
    // Treat as first turn only for genuinely new conversations.
    // On reload, a fresh extension closure starts with isFirstTurn = true, so
    // we explicitly reset to false to avoid a spurious rename mid-conversation.
    if (event.reason === "startup" || event.reason === "new") {
      isFirstTurn = true;
    } else {
      isFirstTurn = false;
    }
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
    promptGuidelines: [
      "Use tmux_rename_window if the conversation topic has shifted significantly from the current window name.",
    ],
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

    if (isFirstTurn) {
      // Explicit instruction to rename immediately on the first response
      return {
        systemPrompt:
          event.systemPrompt +
          `\n\n## Tmux Window Naming\n\nCall \`tmux_rename_window\` in your FIRST response with a short (2-4 word) label reflecting the conversation topic (e.g. "debug zsh config", "ansible homebrew task"). Do not rename on every response.`,
      };
    }

    // On subsequent turns, just surface the current window name so the LLM
    // can judge whether a topic-shift rename is warranted — no nagging instruction.
    const current = getCurrentWindowName();
    if (current) {
      return {
        systemPrompt:
          event.systemPrompt + `\n\nCurrent tmux window name: "${current}"`,
      };
    }
  });
}
