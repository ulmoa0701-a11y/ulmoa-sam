"""Generate short Korean count-in voice cues with the open-weight Supertonic model.

Use once during build; do not synthesize speech at play time or transmit child data.
Model: Supertone/supertonic-2 (OpenRAIL-M); code: MIT.
Record and publish only '하나/둘/셋/넷'; no fake child-voice assertion.
"""
from pathlib import Path
import subprocess
import wave

from supertonic import TTS

ROOT = Path(__file__).parent
OUT = ROOT / "voice"
OUT.mkdir(parents=True, exist_ok=True)
tts = TTS(auto_download=True)
for style_name, suffix in (("F1", "soft"), ("F4", "bright")):
    style = tts.get_voice_style(voice_name=style_name)
    for name, word in (("hana", "하나"), ("dul", "둘"), ("set", "셋"), ("net", "넷")):
        raw_path = OUT / (f".{suffix}-{name}.wav")
        output = OUT / f"{suffix}-{name}.wav"
        samples, seconds = tts.synthesize(word + ".", voice_style=style, lang="ko")
        tts.save_audio(samples, str(raw_path))
        # Keep each spoken beat short enough to fit 140 BPM (428 ms/beat).
        # No odd pitch-shifting to pretend an adult is a child.
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(raw_path), "-af",
            "highpass=f=130,lowpass=f=5500,"
            "silenceremove=start_periods=1:start_threshold=-44dB:"
            "stop_periods=1:stop_threshold=-44dB,"
            "acompressor=threshold=-22dB:ratio=2.0:attack=8:release=80,"
            "alimiter=limit=0.86",
            "-ar", "22050", "-ac", "1", "-c:a", "pcm_s16le",
            str(output)
        ], check=True)
        raw_path.unlink(missing_ok=True)
        with wave.open(str(output), "rb") as f:
            duration = f.getnframes() / f.getframerate()
        if duration <= .07:
            raise RuntimeError(f"Voice cue too short: {output}, {duration:.3f}s")
        if duration > .38:
            # Preserve the natural timbre; change tempo only as much as needed.
            speed = duration / .38
            temporary = OUT / (f".stretch-{suffix}-{name}.wav")
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(output), "-af", f"atempo={speed:.4f},alimiter=limit=0.86",
                "-ar", "22050", "-ac", "1", "-c:a", "pcm_s16le",
                str(temporary)
            ], check=True)
            temporary.replace(output)
        with wave.open(str(output), "rb") as f:
            final_duration = f.getnframes() / f.getframerate()
        print(f"VOICE_CUE {suffix} {word} duration={final_duration:.3f}s bytes={output.stat().st_size}")
print("VOICE_CUE_BUILD_OK")
