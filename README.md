# JARVIS

A local voice assistant for Windows 10/11. Everything runs on your own machine:
[Ollama](https://ollama.com) serves the language model, Whisper transcribes your
microphone, and Windows SAPI5 speaks the replies. Nothing is sent to a cloud API.

## Install

Download or clone this folder, then double-click **`JARVIS Official Setup.bat`**.

The setup script:

1. creates `%USERPROFILE%\JARVIS` with its `config`, `data`, `logs`, `models` and `skills` folders
2. checks for Python 3.10+ (offering a winget install if it is missing)
3. copies the application files and builds an isolated `.venv`
4. installs the dependencies from `requirements.txt`
5. installs Ollama if needed and pulls the model (`llama3.1:8b` by default)
6. writes `config/config.json` and `.env` — existing files are never overwritten
7. creates `Run JARVIS.bat` plus desktop and Start Menu shortcuts
8. runs a self-test and prints what works

Administrator rights are not required; only the optional winget installs prompt.
A full transcript is written to `%USERPROFILE%\JARVIS\logs\setup.log`.

### Setup options

```
"JARVIS Official Setup.bat" [options]

  --dir <path>     Install location      (default %USERPROFILE%\JARVIS)
  --model <name>   Ollama model to pull  (default llama3.1:8b)
  --skip-ollama    Do not install or check Ollama
  --skip-model     Install Ollama but do not pull the model
  --force          Rebuild the virtual environment from scratch
  --no-shortcut    Do not create desktop / Start Menu shortcuts
  --no-pause       Do not wait for a key press when finished
  -h, --help       Show help
```

Re-running the setup is safe: it repairs the environment and leaves your
configuration and conversation history alone.

## Use

```
"Run JARVIS.bat"                  text chat
"Run JARVIS.bat" --voice          speak and listen
"Run JARVIS.bat" --ask "hello"    one question, then exit
"Run JARVIS.bat" --selftest       check the installation
```

In text chat, `clear` forgets the conversation and `exit` quits.

## Configuration

`config/config.json` is created from `config.default.json` on first install:

| Key | What it does |
| --- | --- |
| `model` | Ollama model tag, e.g. `llama3.1:8b` |
| `ollama_host` | Where the Ollama server listens |
| `system_prompt` | How JARVIS is told to behave |
| `temperature` | Higher is more creative |
| `max_history_turns` | How much conversation is sent back to the model |
| `voice.enabled` | Speak replies aloud (`--voice` turns this on for one run) |
| `voice.rate` / `voice.voice_name` | SAPI5 speed and which installed voice to use |
| `listen.whisper_model` | Whisper size — `tiny.en`, `base.en`, `small.en`, … |
| `listen.silence_threshold` / `listen.silence_seconds` | When a spoken turn is considered finished |

`.env` overrides the file: `JARVIS_MODEL`, `JARVIS_OLLAMA_HOST`, `JARVIS_VOICE`,
`JARVIS_LOG_LEVEL`.

Conversations are appended to `data/history.jsonl`.

## Troubleshooting

**"Ollama is not answering"** — start the Ollama app, or run `ollama serve`.

**"The model is not downloaded yet"** — run `ollama pull llama3.1:8b`.

**Speech input is unavailable** — `faster-whisper` and `sounddevice` are optional.
Re-run the setup, or install them into the environment yourself. JARVIS falls back
to typing.

**No voice output** — set `voice.enabled` to `true` in `config/config.json`, and
check that Windows has a SAPI5 voice installed under Settings → Time & language → Speech.

**Something else** — read `logs/setup.log`, then run `"Run JARVIS.bat" --selftest`.
