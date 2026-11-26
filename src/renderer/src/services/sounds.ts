/**
 * Completion sounds synthesised with Web Audio, so there are no asset files
 * to ship and everything works offline.
 */

import type { SoundName } from '@shared/settings'

/** Labels are translation keys (sound.chime, sound.bell, sound.soft). */
export const SOUND_OPTIONS: { value: SoundName; label: `sound.${SoundName}` }[] = [
  { value: 'chime', label: 'sound.chime' },
  { value: 'bell', label: 'sound.bell' },
  { value: 'soft', label: 'sound.soft' }
]

let ctx: AudioContext | null = null

function audio(): AudioContext {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function note(ac: AudioContext, freq: number, at: number, length: number, type: OscillatorType, peak: number): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

export function playSound(name: SoundName): void {
  try {
    const ac = audio()
    const t = ac.currentTime + 0.02
    switch (name) {
      case 'bell':
        note(ac, 880, t, 1.8, 'sine', 0.22)
        note(ac, 1320, t, 1.2, 'sine', 0.08)
        note(ac, 2217, t, 0.6, 'sine', 0.03)
        break
      case 'soft':
        note(ac, 523.25, t, 1.1, 'sine', 0.18)
        break
      case 'chime':
      default:
        note(ac, 659.25, t, 0.9, 'sine', 0.2)
        note(ac, 987.77, t + 0.18, 1.3, 'sine', 0.18)
        break
    }
  } catch (err) {
    console.warn('[sound] could not play sound:', err)
  }
}
