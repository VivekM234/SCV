const EPA_PFAS = "https://www.epa.gov/pfas";

const PRODUCTS = [
  {
    name: "Non-stick cookware",
    detail: "Pans with slick coatings, like Teflon pans",
  },
  {
    name: "Stain-resistant fabrics",
    detail: "Carpet, sofas, car seats",
  },
  {
    name: "Waterproof clothing",
    detail: "Rain jackets and hiking boots",
  },
  {
    name: "Food packaging",
    detail: "Fast-food wrappers, microwave popcorn bags, pizza boxes",
  },
  {
    name: "Personal care products",
    detail: "Some waterproof makeup, dental floss",
  },
];

const EFFECTS = [
  "Increased cholesterol",
  "Changes in liver function",
  "Lower birth weights",
  "Effects on the immune system",
];

const CHAIN = Array.from({ length: 8 }, (_, i) => {
  const x = 52 + i * 56;
  const lower = i % 2 === 0;
  return { x, y: lower ? 124 : 84, dir: lower ? 1 : -1, last: i === 7, first: i === 0 };
});

function BondFigure() {
  return (
    <figure className="bond">
      <svg
        viewBox="0 0 506 210"
        role="img"
        aria-label="Simplified drawing of a PFAS molecule: a zigzag chain of carbon atoms with fluorine atoms attached"
      >
        <polyline
          className="bond-chain"
          points={CHAIN.map((c) => `${c.x},${c.y}`).join(" ")}
        />
        {CHAIN.map((c, i) => {
          const spots = [
            [c.x - 14, c.y + c.dir * 40],
            [c.x + 14, c.y + c.dir * 40],
          ];
          if (c.last) spots.push([c.x + 40, c.y - 8]);
          if (c.first) spots.push([c.x - 40, c.y + 8]);
          return (
            <g key={i}>
              {spots.map(([fx, fy], j) => (
                <g key={j}>
                  <line className="bond-link" x1={c.x} y1={c.y} x2={fx} y2={fy} />
                  <circle className="bond-f" cx={fx} cy={fy} r="8" />
                </g>
              ))}
              <circle className="bond-c" cx={c.x} cy={c.y} r="10" />
            </g>
          );
        })}
      </svg>
      <figcaption>
        A simplified PFAS molecule: a chain of carbon atoms (gray) wrapped in
        fluorine atoms (green). The carbon&ndash;fluorine bond is what makes
        PFAS so durable.
      </figcaption>
    </figure>
  );
}

export default function PfasPage() {
  return (
    <main className="pfas">
      <section className="pfas-hero">
        <div className="wrap pfas-hero-grid">
          <div>
            <span className="tag">[00 // PFAS PRIMER]</span>
            <span className="tag">[00 // PFAS PRIMER]</span>
            <h1>What are PFAS?</h1>
            <p className="pfas-lede">
              PFAS (short for per- and polyfluoroalkyl substances) are a large
              group of man-made chemicals that have been used in thousands of
              everyday products since the 1940s.
            </p>
            <p className="pfas-body">
              They are often nicknamed &ldquo;forever chemicals&rdquo; because
              the chemical bond holding them together is extremely strong. This
              means they do not break down easily in the environment or in the
              human body&mdash;they stay around for a very long time.
            </p>
          </div>
          <BondFigure />
        </div>
      </section>

      <section className="pfas-section" id="special">
        <div className="wrap">
          <span className="tag">[01 // PROPERTIES]</span>
          <span className="tag">[01 // PROPERTIES]</span>
          <h2>What makes them special?</h2>
          <p className="pfas-intro">
            PFAS are extremely effective at repelling water, oil, grease, and
            heat. Because of these unique properties, manufacturers use them to
            make products resistant to stains, sticking, and moisture.
          </p>
          <ul className="repels" aria-label="Repelled by PFAS">
            <li>Water</li>
            <li>Oil</li>
            <li>Grease</li>
            <li>Heat</li>
          </ul>
        </div>
      </section>

      <section className="pfas-section pfas-section-white">
        <div className="wrap">
          <span className="tag">[02 // PRODUCTS]</span>
          <span className="tag">[02 // PRODUCTS]</span>
          <h2>Common products made with PFAS</h2>
          <p className="pfas-intro">
            You can find PFAS in many household items, including:
          </p>
          <ul className="product-list">
            {PRODUCTS.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong>
                <span>{p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pfas-section">
        <div className="wrap">
          <span className="tag">[03 // CONCERNS]</span>
          <span className="tag">[03 // CONCERNS]</span>
          <h2>Why should we be concerned?</h2>
          <div className="concerns">
            <article className="card-dark">
              <h3>They accumulate over time</h3>
              <p>
                Because they don&rsquo;t break down, exposure to small amounts
                over many years can build up in the soil, drinking water, and
                human bloodstream.
              </p>
            </article>
            <article className="card-dark">
              <h3>Widespread presence</h3>
              <p>
                Most people have small trace amounts of PFAS in their blood due
                to contamination in drinking water and everyday consumer
                products.
              </p>
            </article>
            <article className="card-dark">
              <h3>Health impacts</h3>
              <p>
                Research shows that long-term exposure to high levels of
                certain PFAS can lead to health concerns, such as:
              </p>
              <ul className="effects">
                {EFFECTS.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="takeaway">
        <div className="wrap">
          <h2 className="takeaway-title">Key takeaway</h2>
          <p className="takeaway-text">
            PFAS are useful chemicals that make products waterproof and
            grease-proof, but their ability to last forever in the environment
            makes them a growing focus for water filtration, safety
            regulations, and cleaner manufacturing.
          </p>
          <div className="takeaway-actions">
            <a className="btn" href="#home">
              Search your water
            </a>
            <a
              className="btn btn-ghost"
              href={EPA_PFAS}
              target="_blank"
              rel="noreferrer"
            >
              Learn more from EPA ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
