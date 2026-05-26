"use client"
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function NewObjectivePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/objectives') }, [router])
  return null
}
