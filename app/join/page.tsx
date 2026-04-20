'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface JoinResponse {
  error?: string
}

function JoinContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const token         = searchParams.get('token')

  const [status, setStatus]   = useState<Status>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!token) {
      setStatus('error')
      setMessage('Invalid invite link.')
      return
    }
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=/join?token=${token}`)
      return
    }

    setStatus('loading')
    fetch('/api/agency/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json() as Promise<JoinResponse>)
      .then((data) => {
        if (data.error) {
          setStatus('error')
          setMessage(data.error)
        } else {
          setStatus('success')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      })
  }, [isLoaded, isSignedIn, token, router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'idle' || status === 'loading' ? (
          <>
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Accepting your invite…</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">You&apos;re in!</h2>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Invite Error</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
