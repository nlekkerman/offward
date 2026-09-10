function AccessDeniedPage() {
  return (
    <section className="management-page access-denied-page">
      <p className="eyebrow">Access denied</p>
      <h1>Admin access required</h1>
      <p>This account does not have the required Offward management permissions.</p>
    </section>
  )
}

export default AccessDeniedPage
