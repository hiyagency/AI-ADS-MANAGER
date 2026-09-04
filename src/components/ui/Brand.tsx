export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className={`brand-lockup ${inverse ? 'brand-lockup--inverse' : ''}`}>
      <span className="brand-logo-crop" aria-hidden="true">
        <img src="/hiy-agency-logo.jpg" alt="" />
      </span>
      {!compact && (
        <span className="brand-product-name">
          <strong>ADS MANAGER</strong>
          <small>by HIY AGENCY</small>
        </span>
      )}
    </div>
  )
}
