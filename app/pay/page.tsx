'use client'
import { useState } from 'react'
import FingerprintStatus from '../../components/FingerprintStatus'
import { postJson } from '../../lib/api'
import type { FingerPayload } from '../../lib/fingerprint'

type PayResp = {
  ok: boolean
  phoneTail?: string
  balance?: number
}

export default function PayPage() {
  const [result, setResult] = useState<PayResp | null>(null)
  const [waiting, setWaiting] = useState(false)

  const onFPDone = async (fp: FingerPayload) => {
    try {
      const res = await postJson<PayResp>('/pay', { fingerprintId: fp.fingerprintId, confidence: fp.confidence, ts: Date.now(), deviceId: fp.deviceId || 'WEB' })
      setResult(res)
    } catch (e:any) {
      setResult({ ok: false })
      alert('결제 실패: ' + e.message)
    } finally {
      setWaiting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">결제</h1>
        <div className="w-full mb-4">
          <p className="text-gray-700 text-center mb-2">결제 대기 화면</p>
          {!waiting && (
            <button
              className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              onClick={() => setWaiting(true)}
            >
              지문 인식 시작
            </button>
          )}
        </div>
        {waiting && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-4 w-full bg-blue-100 text-blue-700 rounded p-3 text-center animate-pulse">지문 인식 중입니다...</div>
            <FingerprintStatus onComplete={onFPDone} autoStart />
          </div>
        )}
        <hr className="w-full my-4 border-gray-200" />
        {result && (result.ok ? (
          <div className="w-full bg-green-100 text-green-800 rounded p-4 text-center mb-2">
            ✅ 결제 성공<br />
            전화번호 뒷자리: <b>{result.phoneTail}</b><br />
            남은 잔액: <b>{result.balance?.toLocaleString()} 원</b>
          </div>
        ) : (
          <div className="w-full bg-red-100 text-red-800 rounded p-4 text-center mb-2">등록된 지문이 없습니다. 다시 인식해주세요.</div>
        ))}
      </div>
    </main>
  )
}
