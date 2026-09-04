import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export function AdminState({ loading, error, onRetry }: { loading: boolean; error?: string | null; onRetry?: () => void }) {
  if (loading) {
    return (
      <div className="admin-state" aria-live="polite" aria-busy="true">
        <LoaderCircle className="spin" />
        <strong>Loading the command layer</strong>
        <p>Reading the latest client and offer records.</p>
      </div>
    )
  }

  return (
    <div className="admin-state admin-state--error" role="alert">
      <CircleAlert />
      <strong>Workspace data is unavailable</strong>
      <p>{error || 'The request could not be completed.'}</p>
      {onRetry && <Button type="button" variant="secondary" onClick={onRetry}><RefreshCw size={15} /> RETRY</Button>}
    </div>
  )
}
