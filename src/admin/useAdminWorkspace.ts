import { useCallback, useEffect, useState } from 'react'
import { loadAdminWorkspace, type AdminWorkspaceData } from './data'

type WorkspaceState = {
  data: AdminWorkspaceData | null
  loading: boolean
  error: string | null
}

export function useAdminWorkspace() {
  const [state, setState] = useState<WorkspaceState>({ data: null, loading: true, error: null })

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const data = await loadAdminWorkspace()
      setState({ data, loading: false, error: null })
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'The admin workspace could not be loaded.',
      })
    }
  }, [])

  useEffect(() => {
    let active = true
    loadAdminWorkspace()
      .then((data) => { if (active) setState({ data, loading: false, error: null }) })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'The admin workspace could not be loaded.',
          })
        }
      })
    return () => { active = false }
  }, [])

  return { ...state, reload }
}
