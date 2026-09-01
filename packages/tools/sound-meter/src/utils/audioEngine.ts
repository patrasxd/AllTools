import type { SoundReferenceLevel, SoundWeighting } from '../types'

export const REFERENCE_LEVELS: SoundReferenceLevel[] = [
  { min: 0, max: 35, labelEn: 'Quiet Room / Whisper', labelPl: 'Cichy pokój / Szept', severity: 'calm' },
  { min: 35, max: 55, labelEn: 'Library / Moderate Room', labelPl: 'Biblioteka / Spokojne wnętrze', severity: 'calm' },
  { min: 55, max: 70, labelEn: 'Normal Conversation / Office', labelPl: 'Normalna rozmowa / Biuro', severity: 'normal' },
  { min: 70, max: 85, labelEn: 'Street Traffic / Loud Music', labelPl: 'Ruch uliczny / Głośna muzyka', severity: 'loud' },
  { min: 85, max: 100, labelEn: 'Heavy Machinery / Warning Level', labelPl: 'Hałas przemysłowy / Próg ryzyka', severity: 'warning' },
  { min: 100, max: 140, labelEn: 'Siren / Hearing Damage Risk', labelPl: 'Syreny alarmowe / Zagrożenie słuchu', severity: 'danger' },
]

export function getSoundReference(db: number, locale: 'en' | 'pl' = 'en'): { label: string; severity: string } {
  const match = REFERENCE_LEVELS.find((l) => db >= l.min && db < l.max) || REFERENCE_LEVELS[REFERENCE_LEVELS.length - 1]
  return {
    label: locale === 'pl' ? match.labelPl : match.labelEn,
    severity: match.severity,
  }
}

export class DecibelMeterEngine {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private dataArray: Float32Array | null = null
  private isRunning: boolean = false
  public calibrationOffset: number = 0 // in dB
  public weighting: SoundWeighting = 'dBA'

  async start(calibrationOffset: number = 0, weighting: SoundWeighting = 'dBA'): Promise<void> {
    this.calibrationOffset = calibrationOffset
    this.weighting = weighting

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.mediaStream = stream

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new AudioContextClass()

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.3

    if (weighting === 'dBA') {
      // Approximate A-weighting bandpass curve around human ear peak (1kHz-4kHz)
      this.filterNode = this.audioContext.createBiquadFilter()
      this.filterNode.type = 'peaking'
      this.filterNode.frequency.value = 2500
      this.filterNode.Q.value = 0.5
      this.filterNode.gain.value = 2.0

      this.sourceNode.connect(this.filterNode)
      this.filterNode.connect(this.analyser)
    } else {
      this.sourceNode.connect(this.analyser)
    }

    this.dataArray = new Float32Array(this.analyser.fftSize)
    this.isRunning = true
  }

  stop(): void {
    this.isRunning = false
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
  }

  getCurrentDecibels(): number {
    const analyser = this.analyser
    const dataArray = this.dataArray
    if (!this.isRunning || !analyser || !dataArray) return 0

    ;(analyser as any).getFloatTimeDomainData(dataArray)

    let sumSquares = 0
    for (let i = 0; i < dataArray.length; i++) {
      sumSquares += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sumSquares / dataArray.length)

    if (rms <= 0.00001) return 20

    // Standard acoustic calibration approximation for client-side mic
    // 20 * log10(rms) + 94 dB SPL reference offset + calibration
    const rawDb = 20 * Math.log10(rms) + 94 + this.calibrationOffset
    return Math.max(15, Math.min(130, Math.round(rawDb * 10) / 10))
  }
}
