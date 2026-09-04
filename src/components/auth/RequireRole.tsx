import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/context'
import { homeForRole } from '../../auth/access'
import { PortalStatePage } from '../../pages/PortalPage'
import type { AppRole } from '../../types/database'

export function RequireRole({ allowedRoles }: { allowedRoles: readonly AppRole[] }) {
  const location = useLocation()
  const { status, profile, deniedReason, error, retryAccess, signOut } = useAuth()

  if (status === 'loading' || status === 'resolving') return <PortalStatePage kind="loading" />
  if (status === 'misconfigured') return <PortalStatePage kind="misconfigured" />
  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  if (status === 'denied') {
    return <PortalStatePage kind="denied" deniedReason={deniedReason} onSignOut={signOut} />
  }
  if (status === 'error') {
    return <PortalStatePage kind="error" detail={error} onRetry={retryAccess} onSignOut={signOut} />
  }
  if (!profile) {
    return <PortalStatePage kind="error" onRetry={retryAccess} onSignOut={signOut} />
  }
  if (!allowedRoles.includes(profile.role)) return <Navigate to={homeForRole(profile.role)} replace />
  return <Outlet />
}
