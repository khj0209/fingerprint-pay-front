'use client'
import { useEffect, useState } from 'react'
import { FingerPayload, requestSerialAndWaitForFingerprint } from '../lib/fingerprint'

type Props = {
  onComplete: (payload: FingerPayload)=>void
}

export default function FingerprintStatus({ onComplete }: Props) {
  const [status, setStatus] = useState<'idle'|'waiting'|'error'|'ok'>('idle')
  const [msg, setMsg] = useState('지문 인식을 시작하려면 아래 버튼을 클릭하세요')
  const [isSerialSupported, setIsSerialSupported] = useState(true)

  // Web Serial API 지원 확인
  useEffect(() => {
    if (!('serial' in navigator)) {
      setIsSerialSupported(false)
      setStatus('error')
      setMsg('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.')
    }
  }, [])

  const start = async () => {
    setStatus('waiting'); setMsg('시리얼 포트를 선택해주세요.')
    const ctrl = new AbortController()
    try {
      const fp = await requestSerialAndWaitForFingerprint(
        ctrl.signal, 
        (statusMsg) => setMsg(statusMsg)
      )
      setStatus('ok'); setMsg('지문 인식 완료')
      onComplete(fp)
    } catch (e: any) {
      setStatus('error'); 
      let errorMsg = e?.message || '오류가 발생했습니다.'
      
      // 사용자 친화적인 에러 메시지 제공
      if (errorMsg.includes('시리얼 포트를 선택해주세요')) {
        errorMsg += '\n\n💡 팁: 브라우저에서 시리얼 포트 선택 다이얼로그가 나타나면 Arduino 또는 지문 인식기를 선택해주세요.'
      }
      
      setMsg(errorMsg)
      console.error('지문 인식 오류:', e)
    }
  }



  return (
    <div className="card">
      <div className="center">
        {status === 'waiting' ? <div className="loader"/> : <span className="badge">STATUS</span>}
        <div>{msg}</div>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={start} disabled={status === 'waiting' || !isSerialSupported}>
          {!isSerialSupported ? '브라우저 미지원' : status === 'waiting' ? '연결 중...' : status === 'error' ? '다시 시도' : '지문 인식 시작'}
        </button>
      </div>
    </div>
  )
}
