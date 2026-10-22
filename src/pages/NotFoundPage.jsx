import { Link } from 'react-router-dom'
import PageMetadata from '../shared/components/PageMetadata.jsx'

function NotFoundPage() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <PageMetadata noindex />
      <div className="not-found-content">
        <p className="not-found-code" aria-hidden="true">404</p>
        <h1 id="not-found-title">Not lost. Just Offward.</h1>
        <p className="not-found-description">Looks like this trail doesn't lead anywhere.</p>
        <nav className="not-found-actions" aria-label="Not found navigation">
          <Link className="not-found-home" to="/">Back to Offward <span aria-hidden="true">→</span></Link>
          <Link className="not-found-explore" to="/explore">Explore</Link>
        </nav>
      </div>
    </section>
  )
}

export default NotFoundPage
