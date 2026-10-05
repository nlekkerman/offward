function AboutPage() {
  return (
    <article className="about-page" aria-labelledby="about-title">
      <header className="about-intro">
        <p className="eyebrow">ABOUT</p>
        <h1 id="about-title">About Offward</h1>
        <div className="about-copy">
          <p>Offward is about leaving the obvious route.</p>
          <p>
            Not necessarily going far. Not necessarily finding something spectacular. Sometimes it is a forest road behind a town, a forgotten village, a small mountain pass, an old track, or a place you would normally drive past without stopping.
          </p>
          <p>
            The idea is simple: travel should not only be about famous destinations. It should also be about the roads between them, the stories hidden around them, and the places that rarely make it into guidebooks.
          </p>
        </div>
      </header>

      <div className="about-body">
        <section className="about-section" aria-labelledby="about-why">
          <h2 id="about-why">Why Offward Exists</h2>
          <div className="about-copy">
            <p>Offward started from a habit of wandering.</p>
            <p>
              Walking, cycling, driving local roads, taking the wrong turn on purpose, and finding places that were never part of the original plan.
            </p>
            <p>
              Over time, those places became connected with stories, routes, videos, people, history, and personal memories.
            </p>
            <p>Offward is a way to collect those discoveries and make them easier to explore.</p>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-find">
          <h2 id="about-find">What You Will Find Here</h2>
          <div className="about-copy">
            <p>Offward connects routes, places, stories, and videos.</p>
            <p>A route can lead to a place. A place can lead to a story. A story can explain why a seemingly ordinary location matters.</p>
            <p>
              Some routes are short walks. Some can take days. Some places are beautiful. Others are interesting because of what happened there, who lived there, or what they meant to somebody.
            </p>
            <p>The goal is not to create another list of tourist attractions.</p>
            <p>It is to show what exists just outside the usual path.</p>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-travels">
          <h2 id="about-travels">The Way Offward Travels</h2>
          <ul className="about-travel-list">
            <li>Local roads over motorways.</li>
            <li>Villages over resorts.</li>
            <li>Walking and cycling whenever possible.</li>
            <li>Independent places over chains.</li>
            <li>Real stories over polished travel slogans.</li>
            <li>And enough freedom to change the route when something more interesting appears.</li>
          </ul>
        </section>

        <section className="about-section" aria-labelledby="about-going">
          <h2 id="about-going">Where It Is Going</h2>
          <div className="about-copy">
            <p>Offward is still growing.</p>
            <p>
              The project begins with places and routes I know personally, especially in Ireland, and will expand through Bosnia, Spain, and eventually much further.
            </p>
            <p>
              The long-term idea is to build a map of routes, places, stories, videos, and local knowledge that helps people explore differently.
            </p>
            <p>Not everything worth finding is far away.</p>
          </div>
          <p className="about-closing">Sometimes you just need to go offward.</p>
        </section>
      </div>
    </article>
  )
}

export default AboutPage