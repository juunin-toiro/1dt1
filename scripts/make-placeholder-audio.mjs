import { writeFileSync } from 'fs'

function makeSilentWav(durationSec, sampleRate = 8000) {
  const numSamples = Math.floor(durationSec * sampleRate)
  const byteRate = sampleRate * 2
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  // PCM samples stay zero-initialized -> silence

  return buffer
}

writeFileSync('public/audio/click.wav', makeSilentWav(0.15))
writeFileSync('public/audio/morning-room.wav', makeSilentWav(2))
console.log('Placeholder audio written to public/audio/')
