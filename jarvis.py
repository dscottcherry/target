"""JARVIS - a local assistant that talks to an Ollama model on this machine.

Run it through "Run JARVIS.bat", or directly:

    .venv\\Scripts\\python.exe jarvis.py            # text chat
    .venv\\Scripts\\python.exe jarvis.py --voice    # speak and listen
    .venv\\Scripts\\python.exe jarvis.py --ask "..."
    .venv\\Scripts\\python.exe jarvis.py --selftest

Exit codes: 0 = fine, 1 = usable but something optional is missing,
2 = a required piece is broken.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import logging
import os
import queue
import re
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
except ImportError:  # optional
    load_dotenv = None

HERE = Path(__file__).resolve().parent
CONFIG_PATH = HERE / "config" / "config.json"
DEFAULTS_PATH = HERE / "config" / "config.default.json"

log = logging.getLogger("jarvis")


# --------------------------------------------------------------------- config
def load_config() -> dict:
    """Defaults, overlaid with config.json, overlaid with the environment."""
    config: dict = {}
    for path in (DEFAULTS_PATH, CONFIG_PATH):
        if path.is_file():
            try:
                config = deep_merge(config, json.loads(path.read_text(encoding="utf-8")))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path.name} is not valid JSON: {exc}")

    if load_dotenv is not None:
        load_dotenv(HERE / ".env")

    if os.getenv("JARVIS_MODEL"):
        config["model"] = os.environ["JARVIS_MODEL"]
    if os.getenv("JARVIS_OLLAMA_HOST"):
        config["ollama_host"] = os.environ["JARVIS_OLLAMA_HOST"]
    if os.getenv("JARVIS_VOICE"):
        config.setdefault("voice", {})["enabled"] = os.environ["JARVIS_VOICE"] not in ("0", "", "false")
    if os.getenv("JARVIS_LOG_LEVEL"):
        config["log_level"] = os.environ["JARVIS_LOG_LEVEL"]

    config.setdefault("model", "llama3.1:8b")
    config.setdefault("ollama_host", "http://127.0.0.1:11434")
    config["ollama_host"] = config["ollama_host"].rstrip("/")
    return config


def deep_merge(base: dict, overlay: dict) -> dict:
    out = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


# --------------------------------------------------------------------- ollama
class Ollama:
    def __init__(self, config: dict):
        self.host = config["ollama_host"]
        self.model = config["model"]
        self.temperature = config.get("temperature", 0.7)
        self.timeout = config.get("request_timeout_seconds", 120)
        # Caps that keep a laptop responsive: a shorter context is faster to
        # process, and a reply cap stops the model from monologuing.
        self.num_ctx = config.get("num_ctx", 2048)
        self.num_predict = config.get("num_predict", 220)
        # Keeping the model resident avoids reloading gigabytes per question.
        self.keep_alive = config.get("keep_alive", "30m")

    def is_up(self) -> bool:
        try:
            requests.get(f"{self.host}/api/tags", timeout=5).raise_for_status()
            return True
        except requests.RequestException:
            return False

    def models(self) -> list[str]:
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=10)
            response.raise_for_status()
            return [m.get("name", "") for m in response.json().get("models", [])]
        except requests.RequestException as exc:
            log.debug("could not list models: %s", exc)
            return []

    def has_model(self) -> bool:
        wanted = self.model
        names = self.models()
        return any(n == wanted or n.split(":")[0] == wanted.split(":")[0] for n in names)

    def chat(self, messages: list[dict]):
        """Yield response chunks as the model produces them."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "keep_alive": self.keep_alive,
            "options": {
                "temperature": self.temperature,
                "num_ctx": self.num_ctx,
                "num_predict": self.num_predict,
            },
        }
        with requests.post(
            f"{self.host}/api/chat", json=payload, stream=True, timeout=self.timeout
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if data.get("error"):
                    raise RuntimeError(data["error"])
                chunk = data.get("message", {}).get("content", "")
                if chunk:
                    yield chunk
                if data.get("done"):
                    return


# ------------------------------------------------------------------- sentences
_SENTENCE_END = re.compile(r"""(?:(?<!\d)\.(?!\d)|[!?\u2026])["')\]]*(?:\s|$)""")


def split_sentences(text: str) -> tuple[list[str], str]:
    """Split off every complete sentence, returning them and the leftover.

    A period between two digits does not end a sentence, so "3.5 miles" is not
    chopped in half on its way to the speech engine.
    """
    out: list[str] = []
    while True:
        match = _SENTENCE_END.search(text)
        if not match:
            break
        segment = text[: match.end()].strip()
        if segment:
            out.append(segment)
        text = text[match.end() :]
    return out, text


def _module_present(name: str) -> bool:
    """True if the module can be imported, without importing it."""
    if name in sys.modules:
        return True
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        return False


# ------------------------------------------------------------------ speech out
class Voice:
    """Windows SAPI5 speech via pyttsx3, on a worker thread.

    Speech runs in the background so the model can keep generating while an
    earlier sentence is still being spoken. The engine is created inside the
    worker because SAPI objects belong to the thread that made them.
    """

    def __init__(self, config: dict):
        settings = config.get("voice", {})
        self.settings = settings
        self.enabled = bool(settings.get("enabled", True))
        self._queue: "queue.Queue[str | None]" = queue.Queue()
        self._thread: threading.Thread | None = None
        self._failed = False
        # Check for the package up front so the banner tells the truth and no
        # warning lands in the middle of a streamed answer.
        if self.enabled and not _module_present("pyttsx3"):
            log.warning("no speech output: pyttsx3 is not installed - re-run the setup to hear replies")
            self._failed = True

    @property
    def available(self) -> bool:
        return self.enabled and not self._failed

    def _start(self) -> None:
        if self._thread is None and self.enabled and not self._failed:
            self._thread = threading.Thread(target=self._worker, daemon=True)
            self._thread.start()

    def _build_engine(self):
        import pyttsx3

        engine = pyttsx3.init()
        engine.setProperty("rate", self.settings.get("rate", 190))
        engine.setProperty("volume", self.settings.get("volume", 1.0))
        wanted = (self.settings.get("voice_name") or "").lower()
        if wanted:
            for v in engine.getProperty("voices"):
                if wanted in v.name.lower():
                    engine.setProperty("voice", v.id)
                    break
        return engine

    def _worker(self) -> None:
        try:
            engine = self._build_engine()
        except Exception as exc:  # pyttsx3 raises plain Exceptions
            log.warning("speech output unavailable: %s", exc)
            self._failed = True
            self._drain()
            return
        while True:
            item = self._queue.get()
            try:
                if item is None:
                    return
                engine.say(item)
                engine.runAndWait()
            except Exception as exc:
                log.warning("speech output failed: %s", exc)
                self._failed = True
            finally:
                self._queue.task_done()

    def _drain(self) -> None:
        """Swallow anything already queued once the engine is known bad."""
        while True:
            item = self._queue.get()
            self._queue.task_done()
            if item is None:
                return

    def say(self, text: str) -> None:
        """Queue one phrase. Returns immediately."""
        if not self.enabled or self._failed or not text or not text.strip():
            return
        self._start()
        self._queue.put(text.strip())

    def wait(self) -> None:
        """Block until everything queued has been spoken."""
        if self._thread is not None and not self._failed:
            self._queue.join()

    def close(self) -> None:
        if self._thread is not None:
            self._queue.put(None)
            self._thread.join(timeout=10)
            self._thread = None


# ------------------------------------------------------------------- speech in
class Ears:
    """Microphone capture plus local Whisper transcription."""

    def __init__(self, config: dict):
        self.settings = config.get("listen", {})
        self.model = None
        self.sd = None
        self.np = None
        self.error = None
        try:
            import numpy
            import sounddevice
            from faster_whisper import WhisperModel

            self.np = numpy
            self.sd = sounddevice
            device = self.settings.get("device", "auto")
            if device == "auto":
                device = "cpu"
            self.model = WhisperModel(
                self.settings.get("whisper_model", "base.en"),
                device=device,
                compute_type="int8" if device == "cpu" else "float16",
                download_root=str(HERE / "models"),
            )
        except Exception as exc:
            self.error = str(exc)
            log.info("speech input unavailable: %s", exc)

    @property
    def available(self) -> bool:
        return self.model is not None

    def listen(self) -> str:
        """Record until the speaker goes quiet, then transcribe."""
        if not self.available:
            return ""
        rate = 16000
        threshold = self.settings.get("silence_threshold", 0.012)
        silence_needed = self.settings.get("silence_seconds", 1.2)
        max_seconds = self.settings.get("max_seconds", 30)

        frames, quiet_for, started = [], 0.0, time.time()
        block = int(rate * 0.1)
        with self.sd.InputStream(samplerate=rate, channels=1, dtype="float32", blocksize=block) as stream:
            while True:
                chunk, _ = stream.read(block)
                frames.append(chunk.copy())
                level = float(self.np.sqrt(self.np.mean(chunk**2)))
                quiet_for = quiet_for + 0.1 if level < threshold else 0.0
                elapsed = time.time() - started
                if quiet_for >= silence_needed and elapsed > 1.0:
                    break
                if elapsed >= max_seconds:
                    break

        audio = self.np.concatenate(frames, axis=0).flatten()
        if float(self.np.abs(audio).max() or 0) < threshold:
            return ""
        segments, _ = self.model.transcribe(audio, language="en", vad_filter=True)
        return " ".join(segment.text.strip() for segment in segments).strip()


# ------------------------------------------------------------------- assistant
class Jarvis:
    def __init__(self, config: dict):
        self.config = config
        self.client = Ollama(config)
        self.voice = Voice(config)
        self.ears = None
        self.name = config.get("name", "JARVIS")
        self.history: list[dict] = []
        history_file = config.get("history_file", "data/history.jsonl")
        self.history_path = HERE / history_file
        self.history_path.parent.mkdir(parents=True, exist_ok=True)

    def messages_for(self, prompt: str) -> list[dict]:
        turns = self.config.get("max_history_turns", 12) * 2
        return (
            [{"role": "system", "content": self.config.get("system_prompt", "")}]
            + self.history[-turns:]
            + [{"role": "user", "content": prompt}]
        )

    def ask(self, prompt: str, echo: bool = True, speak: bool = True) -> str:
        """Stream one reply, speaking each sentence as soon as it is complete."""
        messages = self.messages_for(prompt)
        parts: list[str] = []
        pending = ""
        if echo:
            print(f"\n{self.name}: ", end="", flush=True)
        try:
            for chunk in self.client.chat(messages):
                parts.append(chunk)
                if echo:
                    print(chunk, end="", flush=True)
                if speak and self.voice.available:
                    sentences, pending = split_sentences(pending + chunk)
                    for sentence in sentences:
                        self.voice.say(sentence)
        except requests.RequestException as exc:
            print(f"\n[!] Could not reach Ollama at {self.client.host}: {exc}")
            return ""
        except RuntimeError as exc:
            print(f"\n[!] The model returned an error: {exc}")
            return ""
        if echo:
            print()
        if speak and pending.strip():
            self.voice.say(pending)

        answer = "".join(parts).strip()
        if answer:
            self.history += [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": answer},
            ]
            self.remember(prompt, answer)
        return answer

    def remember(self, prompt: str, answer: str) -> None:
        record = {
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "model": self.client.model,
            "user": prompt,
            "assistant": answer,
        }
        try:
            with self.history_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        except OSError as exc:
            log.warning("could not write history: %s", exc)

    # ---------------------------------------------------------------- loops
    def preflight(self) -> bool:
        if not self.client.is_up():
            print(f"[!] Ollama is not answering at {self.client.host}.")
            print("    Start the Ollama app (or run 'ollama serve') and try again.")
            return False
        if not self.client.has_model():
            print(f"[!] The model '{self.client.model}' is not downloaded yet.")
            print(f"    Run:  ollama pull {self.client.model}")
            return False
        return True

    def chat_loop(self) -> int:
        if not self.preflight():
            return 2
        heard = "speaking replies aloud" if self.voice.available else "text only (--speak to hear replies)"
        print(f"\n{self.name} online - model {self.client.model}, {heard}.")
        print("Type 'exit' to quit, 'clear' to forget this conversation.\n")
        while True:
            try:
                prompt = input("You: ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if not prompt:
                continue
            if prompt.lower() in {"exit", "quit", "bye"}:
                break
            if prompt.lower() == "clear":
                self.history.clear()
                print("(conversation cleared)")
                continue
            self.ask(prompt)
        self.voice.close()
        print(f"{self.name} offline.")
        return 0

    def voice_loop(self) -> int:
        if not self.preflight():
            return 2
        self.ears = Ears(self.config)
        if not self.ears.available:
            print("[!] Speech input is unavailable, falling back to typing.")
            if self.ears.error:
                print(f"    ({self.ears.error})")
            return self.chat_loop()
        if not self.voice.available:
            print("[i] Speech output is off - run with --speak, or set voice.enabled to true in config.json.")

        print(f"\n{self.name} listening - model {self.client.model}.")
        print("Speak after the prompt. Say 'exit' or press Ctrl+C to quit.\n")
        while True:
            try:
                print("[listening...]", end="\r", flush=True)
                heard = self.ears.listen()
                print("               ", end="\r")
                if not heard:
                    continue
                print(f"You: {heard}")
                if heard.lower().strip(" .!?") in {"exit", "quit", "goodbye", "bye"}:
                    break
                self.ask(heard)
                self.voice.wait()
            except KeyboardInterrupt:
                print()
                break
        self.voice.close()
        print(f"{self.name} offline.")
        return 0


# -------------------------------------------------------------------- selftest
def selftest(config: dict) -> int:
    ok, warn = "  [ok]  ", "  [warn]"
    bad, worst = "  [FAIL]", 0

    print(f"\n  Python           : {sys.version.split()[0]}")
    print(f"  Install folder   : {HERE}")

    print(f"\n{ok} configuration loaded ({'config.json' if CONFIG_PATH.is_file() else 'defaults only'})")

    for module in ("requests", "dotenv", "rich"):
        try:
            __import__(module)
            print(f"{ok} required package '{module}'")
        except ImportError:
            print(f"{bad} required package '{module}' is missing")
            worst = 2

    for module, purpose in (("pyttsx3", "speech output"), ("faster_whisper", "speech input"), ("sounddevice", "microphone")):
        try:
            __import__(module)
            print(f"{ok} optional package '{module}' ({purpose})")
        except ImportError:
            print(f"{warn} optional package '{module}' missing - {purpose} disabled")
            worst = max(worst, 1)

    client = Ollama(config)
    if client.is_up():
        print(f"{ok} Ollama is answering at {client.host}")
        if client.has_model():
            print(f"{ok} model '{client.model}' is downloaded")
        else:
            print(f"{warn} model '{client.model}' not downloaded - run: ollama pull {client.model}")
            worst = max(worst, 1)
    else:
        print(f"{warn} Ollama is not answering at {client.host} - start it before using JARVIS")
        worst = max(worst, 1)

    print()
    if worst == 0:
        print("  Self-test passed - JARVIS is ready.")
    elif worst == 1:
        print("  Self-test passed with warnings - core chat will work.")
    else:
        print("  Self-test failed - JARVIS cannot run yet.")
    return worst


# ------------------------------------------------------------------------ main
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvis", description="Local JARVIS assistant")
    parser.add_argument("--voice", action="store_true", help="talk to JARVIS with the microphone")
    parser.add_argument("--speak", action="store_true", help="force spoken replies on")
    parser.add_argument("--quiet", action="store_true", help="force spoken replies off")
    parser.add_argument("--ask", metavar="TEXT", help="ask one question and exit")
    parser.add_argument("--selftest", action="store_true", help="check the installation and exit")
    parser.add_argument("--model", help="override the model for this run")
    args = parser.parse_args(argv)

    config = load_config()
    if args.model:
        config["model"] = args.model
    logging.basicConfig(
        level=getattr(logging, str(config.get("log_level", "INFO")).upper(), logging.INFO),
        format="%(levelname)s %(message)s",
    )

    if args.selftest:
        return selftest(config)

    if args.voice or args.speak:
        config.setdefault("voice", {})["enabled"] = True
    if args.quiet:
        config.setdefault("voice", {})["enabled"] = False

    jarvis = Jarvis(config)
    if args.ask:
        if not jarvis.preflight():
            return 2
        answer = jarvis.ask(args.ask)
        jarvis.voice.wait()
        jarvis.voice.close()
        return 0 if answer else 1
    if args.voice:
        return jarvis.voice_loop()
    return jarvis.chat_loop()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
