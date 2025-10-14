'use client'
import { useState } from 'react'
import FingerprintStatus from '../../components/FingerprintStatus'
import { postJson } from '../../lib/api'
import type { FingerPayload } from '../../lib/fingerprint'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [phoneTail, setPhoneTail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showFP, setShowFP] = useState(false)
  const router = useRouter()

  const onFPDone = async (fp: FingerPayload) => {
    try {
      setLoading(true)
      const res = await postJson<{ ok: boolean }>(
        '/auth/signup',
        { phoneTail, fingerprintId: fp.fingerprintId, confidence: fp.confidence, deviceId: fp.deviceId || 'WEB', ts: Date.now() }
      )
      alert('회원가입 완료!')
      router.push('/load')
    } catch (e:any) {
      alert('회원가입 실패: ' + e.message)
    } finally {
      setLoading(false); setShowFP(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">회원가입</h1>
        <label className="block text-gray-700 text-sm font-semibold mb-2 w-full text-left">전화번호 뒷자리(예: 1234)</label>
        <input
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 text-lg"
          placeholder="예: 1234"
          value={phoneTail}
          onChange={e => setPhoneTail(e.target.value)}
          maxLength={4}
          inputMode="numeric"
        />
        <button
          className={`w-full py-2 rounded-lg font-semibold text-white transition-colors duration-200 mb-4 ${!phoneTail || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={() => setShowFP(true)}
          disabled={!phoneTail || loading}
        >
          {loading ? '로딩 중...' : '지문등록하기'}
        </button>
        <hr className="w-full my-4 border-gray-200" />
        {showFP && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-4 w-full bg-blue-100 text-blue-700 rounded p-3 text-center animate-pulse">지문 인식 중입니다...</div>
            <FingerprintStatus onComplete={onFPDone} autoStart />
          </div>
        )}
      </div>
    </main>
  )
}
