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

export async function requestSerialAndWaitForFingerprint(
  signal?: AbortSignal, 
  onStatusChange?: (status: string) => void
): Promise<FingerPayload> {
  if (!('serial' in navigator)) {
    throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome/Edge를 사용하세요.')
  }

  let port: any
  try {
    // 사용자에게 포트 선택 UI 표시
    port = await (navigator as any).serial.requestPort()
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('시리얼 포트를 선택해주세요.')
    }
    throw new Error('시리얼 포트 연결에 실패했습니다: ' + error.message)
  }

  try {
    // 아두이노는 9600 보드레이트 사용
    await port.open({ baudRate: 9600 })
    console.log('🔗 아두이노 지문인식기 연결 성공! (보드레이트: 9600)')
    
    onStatusChange?.('아두이노 연결됨. 지문 인식 대기 중...')
  } catch (error: any) {
    throw new Error('아두이노 연결에 실패했습니다: ' + error.message)
  }
  const decoder = new TextDecoderStream()
  const inputDone = port.readable!.pipeTo(decoder.writable)
  const inputStream = decoder.readable
  
  console.log('📡 스트림 설정 완료, 데이터 대기 중...')

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
    clearTimeout(timeout)
    try { reader.releaseLock() } catch {}
    try { await (inputDone as any).catch(()=>{}) } catch {}
    try { await port.close() } catch {}
    console.log('🧹 리소스 정리 완료')
  }

  // 타임아웃 설정 (30초)
  const timeout = setTimeout(() => {
    console.log('⏰ 30초 동안 응답이 없습니다. 지문 인식기 연결을 확인해주세요.')
    onStatusChange?.('⏰ 응답 대기 중... 지문 인식기가 연결되어 있나요?')
  }, 30000)

  try {
    while (true) {
      if (signal?.aborted) {
        await cleanup()
        throw new Error('사용자에 의해 취소되었습니다.')
      }
      const { value, done } = await reader.read()
      if (done) break
      const line = String(value).trim()
      
      // 모든 수신된 데이터 로그 출력
      console.log('📥 수신된 데이터:', line)
      
      // 아두이노 상태 메시지 처리
      if (line.includes('손가락을 센서에 대세요')) {
        onStatusChange?.('👆 손가락을 센서에 대세요...')
        continue
      }
      
      if (line.includes('지문 인식 성공')) {
        onStatusChange?.('✅ 지문 인식 성공! 데이터 처리 중...')
        continue
      }
      
      if (line.includes('등록되지 않은 지문')) {
        onStatusChange?.('❌ 등록되지 않은 지문입니다.')
        continue
      }
      
      if (line.includes('지문인식 시스템 준비완료')) {
        onStatusChange?.('🟢 지문인식기 준비완료. 손가락을 센서에 대세요.')
        continue
      }
      
      if (!line.startsWith('{')) {
        console.log('💬 아두이노 메시지:', line)
        continue
      }
      
      try {
        const obj = JSON.parse(line)
        console.log('✅ 파싱된 JSON:', obj)
        
        // 다양한 지문 매칭 이벤트 처리
        if (obj && (
          obj.event === 'finger_match' || 
          obj.event === 'fingerprint_match' ||
          obj.event === 'match' ||
          obj.type === 'fingerprint' ||
          obj.fingerprintId !== undefined
        )) {
          console.log('🎯 지문 매칭 성공!', obj)
          await cleanup()
          
          // 표준 형식으로 변환
          const payload: FingerPayload = {
            event: obj.event || 'finger_match',
            fingerprintId: obj.fingerprintId || obj.fingerprint_id || obj.id || 1,
            confidence: obj.confidence,
            deviceId: obj.deviceId || obj.device_id,
            amount: obj.amount,
            currency: obj.currency,
            ts: obj.ts || obj.timestamp || Date.now(),
            ...obj
          }
          
          return payload
        } else {
          console.log('⏳ 다른 이벤트 수신:', obj.event || obj.type || '알 수 없는 이벤트', obj)
        }
      } catch (parseError) {
        console.log('❌ JSON 파싱 오류:', parseError, '원본 데이터:', line)
      }
    }
    await cleanup()
    throw new Error('지문 데이터 스트림이 종료되었습니다.')
  } catch (e) {
    await cleanup()
    throw e
  }
}
