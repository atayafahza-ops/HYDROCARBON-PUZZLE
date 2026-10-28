class SoundSystem {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  tone({ frequency, duration = 0.08, type = 'square', volume = 0.08, delay = 0, endFrequency = null }) {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(name) {
    if (!this.enabled) return;
    switch (name) {
      case 'click':
        this.tone({ frequency: 300, endFrequency: 220, duration: 0.035, type: 'square', volume: 0.025 });
        break;
      case 'place':
        this.tone({ frequency: 390, endFrequency: 470, duration: 0.07, type: 'triangle', volume: 0.05 });
        break;
      case 'bond':
        this.tone({ frequency: 320, endFrequency: 430, duration: 0.055, type: 'square', volume: 0.035 });
        this.tone({ frequency: 570, duration: 0.045, type: 'triangle', volume: 0.03, delay: 0.045 });
        break;
      case 'delete':
        this.tone({ frequency: 260, endFrequency: 130, duration: 0.09, type: 'sawtooth', volume: 0.035 });
        break;
      case 'hint':
        this.tone({ frequency: 660, duration: 0.06, type: 'triangle', volume: 0.04 });
        this.tone({ frequency: 880, duration: 0.08, type: 'triangle', volume: 0.035, delay: 0.07 });
        break;
      case 'error':
        this.tone({ frequency: 190, endFrequency: 110, duration: 0.16, type: 'sawtooth', volume: 0.05 });
        this.tone({ frequency: 150, endFrequency: 90, duration: 0.18, type: 'square', volume: 0.03, delay: 0.11 });
        break;
      case 'success':
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone({
            frequency,
            duration: 0.16,
            type: 'triangle',
            volume: 0.055,
            delay: index * 0.09,
          });
        });
        break;
      case 'star':
        this.tone({ frequency: 1175, duration: 0.07, type: 'square', volume: 0.035 });
        break;
      case 'unlock':
        this.tone({ frequency: 440, duration: 0.08, type: 'square', volume: 0.035 });
        this.tone({ frequency: 660, duration: 0.09, type: 'square', volume: 0.03, delay: 0.08 });
        break;
      default:
        break;
    }
  }
}

export const sfx = new SoundSystem();
