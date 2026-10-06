# AI Calculator

A perfectly ordinary desktop calculator — except every `=` presses a local AI model to solve `1 + 1`.

Built with **Tauri 2** and **Ollama** (`llama3.2:1b`).

## Prerequisites

1. [Node.js](https://nodejs.org/) (for the Tauri CLI)
2. [Rust](https://rustup.rs/)
3. [Ollama](https://ollama.com/)
4. Pull the tiny model:

```bash
ollama pull llama3.2:1b
```

Make sure the Ollama app/daemon is running (`ollama serve` if needed).

## Run

```bash
npm install
npm run dev
```

Type an expression like `1+1`, hit `=`, and watch the calculator *consult the AI*.

## Build

```bash
npm run build
```

## How it works

1. The UI collects a classic calculator expression.
2. On equals, it shows a loading overlay (“Consulting the AI…”).
3. A Tauri command POSTs to `http://127.0.0.1:11434/api/generate`.
4. The numeric answer is scraped from the model reply and shown on the display.

There is no local math fallback. If Ollama is down, you get a sarcastic error instead of a correct answer from a pocket calculator. That is the point.
