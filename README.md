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
5. installs Ollama if needed and pulls the model (`llama3.2:3b` by default)
6. writes `config/config.json` and `.env` — existing files are never overwritten
7. creates `Run JARVIS.bat` plus desktop and Start Menu shortcuts
8. runs a self-test and prints what works

Administrator rights are not required; only the optional winget installs prompt.
A full transcript is written to `%USERPROFILE%\JARVIS\logs\setup.log`.

### Setup options

```
"JARVIS Official Setup.bat" [options]

  --dir <path>     Install location      (default %USERPROFILE%\JARVIS)
  --model <name>   Ollama model to pull  (default llama3.2:3b)
  --skip-ollama    Do not install or check Ollama
  --skip-model     Install Ollama but do not pull the model
  --force          Rebuild the virtual environment from scratch
  --reset-config   Replace config.json with current defaults (old one kept)
  --no-shortcut    Do not create desktop / Start Menu shortcuts
  --no-pause       Do not wait for a key press when finished
  -h, --help       Show help
```

Re-running the setup is safe: it repairs the environment and leaves your
configuration and conversation history alone.

## Use

```
"Run JARVIS.bat"                  text chat, replies spoken aloud
"Run JARVIS.bat" --voice          speak and listen
"Run JARVIS.bat" --quiet          text chat with no speech
"Run JARVIS.bat" --ask "hello"    one question, then exit
"Run JARVIS.bat" --selftest       check the installation
```

In text chat, `clear` forgets the conversation and `exit` quits.

## Speed

JARVIS runs the model on your own CPU, so the model size sets the pace. On a
laptop without a discrete GPU:

| Model | Size | Feel |
| --- | --- | --- |
| `llama3.2:1b` | ~1.3 GB | fastest, noticeably simpler answers |
| `llama3.2:3b` | ~2 GB | the default — usable conversation speed |
| `llama3.1:8b` | ~4.7 GB | better answers, often too slow to talk to |

Swap models with `ollama pull llama3.2:1b`, then set `model` in
`config/config.json` (or pass `--model llama3.2:1b` for one run).

Three settings in `config.json` also shape responsiveness. `num_predict` caps
reply length, `num_ctx` caps how much conversation is reprocessed each turn, and
`keep_alive` holds the model in RAM so it is not reloaded between questions.
Replies are spoken sentence by sentence as they generate, so speech begins well
before the full answer is finished.

## Configuration

`config/config.json` is created from `config.default.json` on first install:

| Key | What it does |
| --- | --- |
| `model` | Ollama model tag, e.g. `llama3.2:3b` |
| `ollama_host` | Where the Ollama server listens |
| `system_prompt` | How JARVIS is told to behave |
| `temperature` | Higher is more creative |
| `max_history_turns` | How much conversation is sent back to the model |
| `num_predict` / `num_ctx` / `keep_alive` | Reply cap, context cap, and how long the model stays in RAM |
| `voice.enabled` | Speak replies aloud — on by default (`--quiet` turns it off for one run) |
| `voice.rate` / `voice.voice_name` | SAPI5 speed and which installed voice to use |
| `listen.whisper_model` | Whisper size — `tiny.en`, `base.en`, `small.en`, … |
| `listen.silence_threshold` / `listen.silence_seconds` | When a spoken turn is considered finished |

`.env` overrides the file: `JARVIS_MODEL`, `JARVIS_OLLAMA_HOST`, `JARVIS_VOICE`,
`JARVIS_LOG_LEVEL`.

Conversations are appended to `data/history.jsonl`.

## Troubleshooting

**"Ollama is not answering"** — start the Ollama app, or run `ollama serve`.

**"The model is not downloaded yet"** — run `ollama pull llama3.2:3b`.

**Speech input is unavailable** — `faster-whisper` and `sounddevice` are optional.
Re-run the setup, or install them into the environment yourself. JARVIS falls back
to typing.

**No voice output** — first try `"Run JARVIS.bat" --speak`. If it still does not
speak, the startup banner says which mode it is in; `--selftest` reports whether
`pyttsx3` is installed. Check that Windows has a SAPI5 voice under
Settings → Time & language → Speech. Installs made before speech was enabled by
default keep their old `config.json` — run the setup with `--reset-config` to
adopt the current defaults.

**Something else** — read `logs/setup.log`, then run `"Run JARVIS.bat" --selftest`.
