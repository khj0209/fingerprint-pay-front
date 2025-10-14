'use client'
import { useEffect, useState } from 'react'
import { requestSerialAndWaitForFingerprint, FingerPayload } from '../lib/fingerprint'

type Props = {
  onComplete: (payload: FingerPayload)=>void
  autoStart?: boolean
}

export default function FingerprintStatus({ onComplete, autoStart }: Props) {
  const [status, setStatus] = useState<'idle'|'waiting'|'error'|'ok'>('idle')
  const [msg, setMsg] = useState('')

  const start = async () => {
    setStatus('waiting'); setMsg('지문 인식 중입니다... 센서에 손가락을 대세요.')
    const ctrl = new AbortController()
    try {
      const fp = await requestSerialAndWaitForFingerprint(ctrl.signal)
      setStatus('ok'); setMsg('지문 인식 완료')
      onComplete(fp)
    } catch (e: any) {
      setStatus('error'); setMsg(e?.message || '오류가 발생했습니다.')
    }
  }

  useEffect(()=>{
    if (autoStart) start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  return (
    <div className="card">
      <div className="center">
        {status === 'waiting' ? <div className="loader"/> : <span className="badge">STATUS</span>}
        <div>{msg || '대기 중'}</div>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={start}>지문 인식 시작</button>
      </div>
    </div>
  )
}
