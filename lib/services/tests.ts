/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

function db() {
  return createClient() as any
}

export async function getTestById(testId: string): Promise<IeltsTest | null> {
  const { data } = await db()
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single()
  return data
}

export async function getSectionsByTestId(testId: string): Promise<TestSection[]> {
  const { data } = await db()
    .from('test_sections')
    .select('*')
    .eq('test_id', testId)
    .order('section_number')
  return data ?? []
}

export async function getQuestionsBySectionIds(sectionIds: string[]): Promise<Question[]> {
  const { data } = await db()
    .from('questions')
    .select('*')
    .in('section_id', sectionIds)
    .order('question_number')
  return data ?? []
}

export async function getListeningTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty')
    .eq('type', 'listening')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getReadingTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty')
    .eq('type', 'reading')
    .order('created_at', { ascending: true })
  return data ?? []
}
