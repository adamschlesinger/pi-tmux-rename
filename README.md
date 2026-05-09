# pi-tmux-rename

A [pi](https://pi.dev) extension that automatically renames tmux windows to reflect the current conversation topic.

## What it does

- **On first response**: renames the current tmux window to a short (2-4 word) label matching the conversation topic
- **On topic shift**: renames again if the conversation moves to a significantly different subject
- **Safe outside tmux**: silently no-ops when `$TMUX` is not set, so it's safe to install globally

## Install

```bash
pi install git:github.com/adamschlesinger/pi-tmux-rename
```

## Usage

No configuration needed. After installing, the LLM will automatically call `tmux_rename_window` at the start of each conversation and when the topic shifts.

Example window names:
- `debug zsh config`
- `ansible homebrew task`
- `git rebase help`
- `k8s ingress setup`

## How it works

The extension registers a `tmux_rename_window` tool and injects naming instructions into the system prompt via `before_agent_start`. On first turn it prompts for an immediate rename; on subsequent turns it prompts to rename only on significant topic shifts.
