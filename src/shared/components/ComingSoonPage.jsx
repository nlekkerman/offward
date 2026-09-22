import heroImage from '../../assets/images/home/off-hero.webp'
import './ComingSoonPage.css'

function ComingSoonPage() {
  return (
    <div className="coming-soon">
      <img
        className="coming-soon-image"
        src={heroImage}
        alt=""
        loading="eager"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="coming-soon-content">
        <p className="coming-soon-brand">OFFWARD</p>
        <h1>Coming Soon</h1>
        <p className="coming-soon-tagline">Stories, routes and places beyond the usual path.</p>
      </div>
      <a className="coming-soon-access" href="/manage/login">Access</a>
    </div>
  )
}

export default ComingSoonPage
