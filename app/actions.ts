'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function saveVehicleAction(mode: 'create' | 'edit', id: string | undefined, payload: any) {
  try {
    const supabase = createAdminClient()
    let result
    if (mode === 'create') {
      result = await (supabase.from('vehicles') as any).insert(payload).select().single()
    } else {
      if (!id) throw new Error('ID is required for editing')
      result = await (supabase.from('vehicles') as any).update(payload).eq('id', id).select().single()
    }

    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, data: result.data }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase.from('vehicles') as any).update({ is_active: false }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

export async function saveWorkerAction(mode: 'create' | 'edit', id: string | undefined, payload: any) {
  try {
    const supabase = createAdminClient()
    let result
    if (mode === 'create') {
      result = await (supabase.from('inspectors') as any).insert(payload).select().single()
    } else {
      if (!id) throw new Error('ID is required for editing')
      result = await (supabase.from('inspectors') as any).update(payload).eq('id', id).select().single()
    }

    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, data: result.data }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}

export async function deleteWorkerAction(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase.from('inspectors') as any).update({ is_active: false }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error del servidor' }
  }
}
