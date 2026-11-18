function DetailHero({ children, className = '', style }) {
  return (
    <section className={`detail-hero ${className}`.trim()} style={style}>
      <div className="detail-hero-content">{children}</div>
    </section>
  )
}

export default DetailHero
