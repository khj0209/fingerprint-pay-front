export type FingerPayload = {
  event: string
  fingerprintId: number
  confidence?: number
  deviceId?: string
  amount?: number
  currency?: string
  ts?: number
  [k: string]: any
}

export async function requestSerialAndWaitForFingerprint(signal?: AbortSignal): Promise<FingerPayload> {
  if (!('serial' in navigator)) {
    throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome/Edge를 사용하세요.')
  }

  // 사용자에게 포트 선택 UI 표시
  // @ts-ignore
  const port: SerialPort = await (navigator as any).serial.requestPort()
  await port.open({ baudRate: 9600 })
  const decoder = new TextDecoderStream()
  const inputDone = port.readable!.pipeTo(decoder.writable)
  const inputStream = decoder.readable

  // 줄 단위 분리
  const splitter = new TransformStream({
    transform(chunk, controller) {
      const text = String(chunk)
      for (const line of text.split(/\r?\n/)) {
        if (line.length) controller.enqueue(line)
      }
    }
  })
  const lines = inputStream.pipeThrough(splitter)
  const reader = (lines as any).getReader()

  const cleanup = async () => {
    try { reader.releaseLock() } catch {}
    try { await (inputDone as any).catch(()=>{}) } catch {}
    try { await port.close() } catch {}
  }

  try {
    while (true) {
      if (signal?.aborted) {
        await cleanup()
        throw new Error('사용자에 의해 취소되었습니다.')
      }
      const { value, done } = await reader.read()
      if (done) break
      const line = String(value).trim()
      if (!line.startsWith('{')) continue
      try {
        const obj = JSON.parse(line)
        if (obj && obj.event === 'finger_match') {
          await cleanup()
          return obj as FingerPayload
        }
      } catch { /* ignore parse errors */ }
    }
    await cleanup()
    throw new Error('지문 데이터 스트림이 종료되었습니다.')
  } catch (e) {
    await cleanup()
    throw e
  }
}
