"use client";

/**
 * Utilitário de som para notificações do sistema (Campainha de garçom, novos pedidos, etc.)
 * Usa Web Audio API nativa para síntese harmônica precisa, eliminando problemas de arquivos 404
 * e com fallback seguro para reprodução de áudio.
 */
class SoundNotifier {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => null);
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Toca som de campainha de garçom (triplo tom cristalino e ressonante)
   */
  public playBell(): void {
    const ctx = this.getAudioContext();
    if (!ctx) {
      this.playFallbackAudio();
      return;
    }

    try {
      const now = ctx.currentTime;

      // Primeiro tom (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Segundo tom harmônico (A5 - 880 Hz com delay de 120ms)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.45, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 1.2);

      // Terceiro tom cristalino (E6 - 1318.5 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1318.51, now + 0.22);
      gain3.gain.setValueAtTime(0.35, now + 0.22);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.22);
      osc3.stop(now + 1.5);
    } catch {
      this.playFallbackAudio();
    }
  }

  /**
   * Toca som de novo pedido
   */
  public playNewOrder(): void {
    const ctx = this.getAudioContext();
    if (!ctx) {
      this.playFallbackAudio();
      return;
    }

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const start = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {
      this.playFallbackAudio();
    }
  }

  private playFallbackAudio(): void {
    try {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => null);
    } catch {
      // Ignora restrição de autoplay
    }
  }
}

export const soundNotifier = new SoundNotifier();
