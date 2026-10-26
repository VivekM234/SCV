import "./Contact.css";
import { displayName } from "./lib.js";

// Contact details checked October 2026. Members of Congress can change after
// the November 3, 2026 election (new terms start January 3, 2027), so check
// this list again before relying on it after that.
const AS_OF = "October 2026";

const NC_DEQ_PWS = {
  phone: "(919) 707-9100",
  url: "https://www.deq.nc.gov/about/divisions/water-resources/drinking-water",
};
const NCLEG_LOOKUP = "https://www.ncleg.gov/FindYourLegislators";
const NSF_PFAS = "https://www.nsf.org/consumer-resources/articles/pfas-drinking-water";
const HOUSE_LOOKUP = "https://www.house.gov/representatives/find-your-representative";

const SENATORS = [
  { name: "Sen. Thom Tillis", phone: "(202) 224-6342", url: "https://www.tillis.senate.gov/" },
  { name: "Sen. Ted Budd", phone: "(202) 224-3154", url: "https://www.budd.senate.gov/" },
];

const HOUSE = [
  [1, "Rep. Don Davis", "(202) 225-3101", "https://dondavis.house.gov/"],
  [2, "Rep. Deborah Ross", "(202) 225-3032", "https://ross.house.gov/"],
  [3, "Rep. Greg Murphy", "(202) 225-3415", "https://gregmurphy.house.gov/"],
  [4, "Rep. Valerie Foushee", "(202) 225-1784", "https://foushee.house.gov/"],
  [5, "Rep. Virginia Foxx", "(202) 225-2071", "https://foxx.house.gov/"],
  [6, "Rep. Addison McDowell", "(202) 225-3065", "https://mcdowell.house.gov/"],
  [7, "Rep. David Rouzer", "(202) 225-2731", "https://rouzer.house.gov/"],
  [8, "Rep. Mark Harris", "(202) 225-1976", "https://markharris.house.gov/"],
  [9, "Rep. Richard Hudson", "(202) 225-3715", "https://hudson.house.gov/"],
  [10, "Rep. Pat Harrigan", "(202) 225-2576", "https://harrigan.house.gov/"],
  [11, "Rep. Chuck Edwards", "(202) 225-6401", "https://edwards.house.gov/"],
  [12, "Rep. Alma Adams", "(202) 225-1510", "https://adams.house.gov/"],
  [13, "Rep. Brad Knott", "(202) 225-4531", "https://knott.house.gov/"],
  [14, "Rep. Tim Moore", "(202) 225-5634", "https://timmoore.house.gov/"],
];

function tel(phone) {
  return "tel:+1" + phone.replace(/\D/g, "");
}

function Ext({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children} ↗
    </a>
  );
}

// `system` is the water system the visitor last opened on the Search tab,
// or null if they came straight to this tab.
export default function ContactSection({ system }) {
  return (
    <section className="contact" aria-label="Steps you can take">
      <p className="contact-lead">
        Four steps: tell the people in charge, ask the right questions, filter
        the water you drink, and keep that filter working.
      </p>

      <div className="step-head">
        <span className="tag">[STEP 01]</span>
        <h3>Contact the people in charge</h3>
      </div>
      <p className="contact-step-lead">
        These are the people and offices responsible for your water, from your
        local utility up to Congress.
      </p>

      <div className="contact-grid">
        <article className="contact-card">
          <span className="contact-kicker">01 // YOUR WATER UTILITY</span>
          <strong>
            {system ? displayName(system.name) : "Your local water system"}
          </strong>
          <p>
            Runs your water system and decides how to treat it. Ask what they
            are doing about PFAS and when they plan to meet EPA&rsquo;s limits.
          </p>
          <p className="contact-how">
            Their phone number is on your water bill and in their yearly water
            quality report (also called a Consumer Confidence Report).
            {!system && (
              <>
                {" "}
                Not sure which system serves you?{" "}
                <a href="#home">Search your ZIP code</a>.
              </>
            )}
          </p>
        </article>

        <article className="contact-card">
          <span className="contact-kicker">02 // STATE WATER REGULATOR</span>
          <strong>NC DEQ, Public Water Supply Section</strong>
          <p>
            The state agency that oversees public drinking water systems in
            North Carolina and enforces water-quality rules.
          </p>
          <p className="contact-how">
            <a href={tel(NC_DEQ_PWS.phone)}>{NC_DEQ_PWS.phone}</a>
            <br />
            <Ext href={NC_DEQ_PWS.url}>NC DEQ drinking water page</Ext>
          </p>
        </article>

        <article className="contact-card">
          <span className="contact-kicker">03 // NC STATE LAWMAKERS</span>
          <strong>Your NC House member and NC Senator</strong>
          <p>
            The NC General Assembly writes state laws on water quality and
            pollution, and funds state cleanup programs.
          </p>
          <p className="contact-how">
            Enter your home address to see your two state lawmakers and how to
            reach them:
            <br />
            <Ext href={NCLEG_LOOKUP}>Find your NC legislators</Ext>
          </p>
        </article>

        <article className="contact-card">
          <span className="contact-kicker">04 // CONGRESS</span>
          <strong>Your U.S. Representative</strong>
          <p>
            Congress writes national drinking-water law and oversees EPA, which
            sets the PFAS limits shown on this page.
          </p>
          <p className="contact-how">
            One ZIP code can be split between districts, so look up yours by
            address:
            <br />
            <Ext href={HOUSE_LOOKUP}>Find your U.S. Representative</Ext>
          </p>
          <details className="contact-list">
            <summary>All 14 NC U.S. Representatives</summary>
            <ul>
              {HOUSE.map(([district, name, phone, url]) => (
                <li key={district}>
                  <span className="contact-district">NC-{district}</span>
                  <span>
                    <Ext href={url}>{name}</Ext>
                    <br />
                    <a href={tel(phone)}>{phone}</a>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </article>

        <article className="contact-card contact-wide">
          <span className="contact-kicker">05 // U.S. SENATE</span>
          <strong>North Carolina&rsquo;s two U.S. Senators</strong>
          <p>Both represent everyone in North Carolina.</p>
          <ul className="contact-senators">
            {SENATORS.map((s) => (
              <li key={s.name}>
                <Ext href={s.url}>{s.name}</Ext>
                <a href={tel(s.phone)}>{s.phone}</a>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="step-head">
        <span className="tag">[STEP 02]</span>
        <h3>Know what to ask</h3>
      </div>
      <div className="contact-ask">
        <ul>
          <li>What PFAS levels are in my water now, and has treatment been added since this testing?</li>
          <li>What is the plan and timeline to meet EPA&rsquo;s PFAS limits?</li>
          <li>What funding is available to help my water system remove PFAS?</li>
        </ul>
      </div>

      <div className="step-head">
        <span className="tag">[STEP 03]</span>
        <h3>Choose an effective home filter</h3>
      </div>
      <p className="contact-step-lead">
        To lower your PFAS exposure right away, use a certified{" "}
        <strong>point-of-use</strong> filter: one that treats water at a single
        tap, like an under-sink unit or a countertop pitcher, for the water you
        drink and cook with.
      </p>
      <div className="contact-grid">
        <article className="contact-card">
          <span className="contact-kicker">OPTION A // MOST THOROUGH</span>
          <strong>Reverse osmosis (RO)</strong>
          <p>
            Forces water through a very fine membrane. It catches the widest
            range of PFAS. In a Duke and NC State study of home filters in
            North Carolina, under-sink RO and two-stage filters removed 94% or
            more of PFAS, including GenX. RO units cost more than other filters.
          </p>
        </article>
        <article className="contact-card">
          <span className="contact-kicker">OPTION B // LOWER COST</span>
          <strong>Activated carbon filters</strong>
          <p>
            Traps chemicals on carbon as water passes through. Budget-friendly,
            but results vary a lot: in the same study, pitcher, faucet and
            fridge filters removed 73% of PFAS on average, and some removed
            none. Pick a certified one and change the cartridge on schedule.
          </p>
        </article>
        <article className="contact-card contact-wide">
          <span className="contact-kicker">CHECK BEFORE YOU BUY</span>
          <strong>Look for NSF/ANSI certification for PFAS</strong>
          <p>
            Choose a product certified to <strong>NSF/ANSI Standard 53</strong>{" "}
            (filters) or <strong>Standard 58</strong> (reverse osmosis) that
            specifically lists PFOA/PFOS or PFAS reduction. Certification means
            an independent lab tested the claim. Certification may not guarantee
            levels as low as EPA&rsquo;s new limits, so maintenance still
            matters even with a certified filter.
          </p>
          <p className="contact-how">
            <Ext href={NSF_PFAS}>Search NSF&rsquo;s list of certified filters</Ext>
          </p>
        </article>
      </div>

      <div className="step-head">
        <span className="tag">[STEP 04]</span>
        <h3>Keep it working</h3>
      </div>
      <ul className="tips">
        <li>
          <strong>Replace filters on time.</strong> A used-up filter stops
          catching PFAS. In the Duke and NC State study, some poorly maintained
          systems actually raised PFAS levels. Follow the manufacturer&rsquo;s
          schedule.
        </li>
        <li>
          <strong>Don&rsquo;t boil water to remove PFAS.</strong> Boiling
          doesn&rsquo;t remove them. Water escapes as steam while the PFAS stay
          behind, so what&rsquo;s left in the pot can be more concentrated.
        </li>
        <li>
          <strong>Focus on drinking and cooking water.</strong> Very little PFAS
          gets in through skin, so showering and washing dishes are a much
          smaller concern than drinking. Filtered water matters most for
          drinking, cooking, coffee and tea, and baby formula.
        </li>
      </ul>

      <p className="mono-note contact-note">
        Contact details checked {AS_OF}. Officeholders can change after
        elections, so confirm on the official sites above.
      </p>
    </section>
  );
}
