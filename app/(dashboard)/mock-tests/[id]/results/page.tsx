import { Suspense } from 'react'
import ResultsClient from './ResultsClient'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>}>
      <ResultsClient id={id} />
    </Suspense>
  )
}
