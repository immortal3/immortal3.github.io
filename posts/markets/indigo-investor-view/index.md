# IndiGo: India's Affordable Growth Carrier, by the Numbers

> A beginner-friendly look at IndiGo. A live widget lets you tune three assumptions about how India flies and see what that means for IndiGo's size and market value in 5 to 10 years.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/markets/indigo-investor-view/
- Published: 2026-04-22
- Updated: 2026-04-26
- Tags: markets, india, aviation, indigo, investing

---

IndiGo is the budget airline six of every ten Indian flyers already use. India itself flies very little: roughly **one flight per person every nine years** on average, compared to one every two years in China and 2.5 flights per person every year in the US. That gap is the whole story. This post gives you a widget to play with the math first, then walks through what the numbers mean.

## The widget

Drag the sliders. The top three set how India's aviation market grows. The fourth sets how much the stock market values the resulting earnings. Hover the **?** icons for a plain-language explanation of each lever.

<div class="igw" id="indigo-growth-widget">
  <div class="igw-sub">Defaults = a cautious base case. Use the preset buttons below to jump between cautious, middle, and aggressive views.</div>

  <div class="igw-presets">
    <span class="igw-preset-label">Presets:</span>
    <button type="button" class="igw-preset" data-tpc="0.22" data-years="10" data-share="0.60" data-pe="39">Cautious (half of China)</button>
    <button type="button" class="igw-preset" data-tpc="0.44" data-years="10" data-share="0.60" data-pe="39">Middle (matches China today)</button>
    <button type="button" class="igw-preset" data-tpc="0.63" data-years="10" data-share="0.65" data-pe="45">Aggressive</button>
  </div>

  <div class="igw-controls">
    <label class="igw-row">
      <span class="igw-label">Flights per person per year <span class="igw-tip" tabindex="0" aria-label="Explanation">?<span class="igw-tip-body">How often the average Indian flies in a year. India today is 0.11 (one flight every 9 years). China is 0.44. The US is 2.5. Slide up to model India catching up.</span></span></span>
      <input type="range" id="igw-tpc" min="0.12" max="1.0" step="0.01" value="0.22" aria-label="Target trips per capita">
      <span class="igw-value" id="igw-tpc-v">0.22</span>
    </label>
    <div class="igw-row">
      <span class="igw-label">How many years ahead <span class="igw-tip" tabindex="0" aria-label="Explanation">?<span class="igw-tip-body">The time horizon. 5 years = halfway to 2031. 10 years = 2035.</span></span></span>
      <div class="igw-seg" role="radiogroup" aria-label="Horizon in years">
        <button type="button" class="igw-seg-btn" data-years="5">5y</button>
        <button type="button" class="igw-seg-btn igw-seg-active" data-years="10">10y</button>
      </div>
      <span class="igw-value" id="igw-yrs-v">10y</span>
    </div>
    <label class="igw-row">
      <span class="igw-label">IndiGo's share of domestic flights <span class="igw-tip" tabindex="0" aria-label="Explanation">?<span class="igw-tip-body">IndiGo carries ~60 of every 100 domestic flyers today. Move this up if you think it dominates further, down if you think Air India takes share back.</span></span></span>
      <input type="range" id="igw-share" min="0.40" max="0.70" step="0.01" value="0.60" aria-label="IndiGo domestic share">
      <span class="igw-value" id="igw-share-v">60%</span>
    </label>
    <label class="igw-row">
      <span class="igw-label">How much to pay per ₹1 of profit (P/E) <span class="igw-tip" tabindex="0" aria-label="Explanation">?<span class="igw-tip-body">The stock currently trades at about 39x its yearly profit. A higher P/E means the market pays more for future growth. A lower P/E means confidence has faded.</span></span></span>
      <input type="range" id="igw-pe" min="15" max="50" step="1" value="39" aria-label="Exit P/E multiple">
      <span class="igw-value" id="igw-pe-v">39x</span>
    </label>
  </div>

  <div class="igw-out">
    <div class="igw-line"><span class="igw-k">India's total domestic flyers</span><span class="igw-v" id="igw-pax"></span><span class="igw-bar"><span class="igw-fill" id="igw-pax-bar"></span></span><span class="igw-mult" id="igw-pax-mult"></span></div>
    <div class="igw-line"><span class="igw-k">Market growth per year (CAGR)</span><span class="igw-v" id="igw-cagr"></span><span class="igw-bar"><span class="igw-fill" id="igw-cagr-bar"></span></span><span class="igw-mult" id="igw-cagr-ref"></span></div>
    <div class="igw-line"><span class="igw-k">IndiGo's flyers</span><span class="igw-v" id="igw-ipax"></span><span class="igw-bar"><span class="igw-fill" id="igw-ipax-bar"></span></span><span class="igw-mult" id="igw-ipax-mult"></span></div>
    <div class="igw-line"><span class="igw-k">IndiGo growth per year (CAGR)</span><span class="igw-v" id="igw-icagr"></span><span class="igw-bar"><span class="igw-fill" id="igw-icagr-bar"></span></span><span class="igw-mult" id="igw-icagr-ref"></span></div>
    <div class="igw-line"><span class="igw-k">IndiGo revenue</span><span class="igw-v" id="igw-rev"></span><span class="igw-bar"><span class="igw-fill" id="igw-rev-bar"></span></span><span class="igw-mult" id="igw-rev-mult"></span></div>
    <div class="igw-line igw-hero"><span class="igw-k">IndiGo market cap (implied)</span><span class="igw-v" id="igw-mcap"></span><span class="igw-bar"><span class="igw-fill" id="igw-mcap-bar"></span></span><span class="igw-mult" id="igw-mcap-mult"></span></div>
  </div>

  <div class="igw-note">Starting values: India 184M domestic flyers in 2025, IndiGo 118M of them, IndiGo revenue ₹80,803 cr, profit margin 9%, market cap ₹1.79 lakh cr. Revenue per flyer held flat. Population grows linearly to 1.55B by 2035. Bars compare against Airbus's 8.9% forecast. Not investment advice.</div>
</div>

<style>
.igw { border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin: 25px 0; background: #fafafa; font-size: 0.95em; }
.igw-sub { color: #666; font-size: 0.9em; margin-bottom: 12px; }
.igw-presets { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 18px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5; }
.igw-preset-label { color: #666; font-size: 0.85em; margin-right: 4px; }
.igw-preset { font-family: inherit; font-size: 0.85em; border: 1px solid #d0d0d0; background: #fff; color: #000; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.igw-preset:hover { border-color: #6366f1; color: #6366f1; }
.igw-controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.igw-row { display: grid; grid-template-columns: 220px 1fr 70px; align-items: center; gap: 10px; }
.igw-label { color: #000; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px; }
.igw-tip { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: #e5e5e5; color: #666; font-size: 0.75em; font-weight: 700; cursor: help; user-select: none; }
.igw-tip:hover, .igw-tip:focus { background: #6366f1; color: #fff; outline: none; }
.igw-tip-body { visibility: hidden; opacity: 0; position: absolute; left: 20px; top: -4px; width: 240px; padding: 8px 10px; background: #000; color: #fff; font-size: 0.8em; font-weight: 400; line-height: 1.4; border-radius: 4px; z-index: 20; transition: opacity 0.15s; pointer-events: none; }
.igw-tip:hover .igw-tip-body, .igw-tip:focus .igw-tip-body { visibility: visible; opacity: 1; }
.igw-value { color: #6366f1; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.igw input[type="range"] { width: 100%; accent-color: #6366f1; }
.igw-seg { display: inline-flex; gap: 6px; }
.igw-seg-btn { font-family: inherit; font-size: 0.9em; border: 1px solid #d0d0d0; background: #fff; color: #000; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
.igw-seg-btn:hover { border-color: #6366f1; }
.igw-seg-active { background: #6366f1; color: #fff; border-color: #6366f1; }
.igw-out { border-top: 1px solid #e5e5e5; padding-top: 15px; display: flex; flex-direction: column; gap: 10px; }
.igw-line { display: grid; grid-template-columns: 240px 100px 1fr 80px; align-items: center; gap: 10px; }
.igw-hero { border-top: 1px dashed #d5d5d5; padding-top: 10px; margin-top: 4px; }
.igw-hero .igw-v { color: #6366f1; font-size: 1.05em; }
.igw-k { color: #000; font-size: 0.9em; }
.igw-v { color: #000; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.igw-bar { display: block; height: 8px; background: #eee; border-radius: 3px; overflow: hidden; }
.igw-fill { display: block; height: 100%; width: 0%; background: #6366f1; transition: width 0.25s; }
.igw-mult { color: #666; font-size: 0.85em; text-align: right; font-variant-numeric: tabular-nums; }
.igw-note { color: #666; font-size: 0.8em; margin-top: 15px; line-height: 1.5; }
@media (max-width: 600px) {
  .igw-row { grid-template-columns: 1fr; gap: 6px; }
  .igw-value { text-align: left; }
  .igw-line { grid-template-columns: 1fr auto; }
  .igw-bar, .igw-mult { grid-column: 1 / -1; }
  .igw-tip-body { left: auto; right: 0; top: 20px; }
}
</style>

<script>
(function () {
  var POP_2025 = 1451, POP_2035 = 1545, PAX_2025 = 184, INDIGO_2025 = 118;
  var REV_2025 = 80803, REV_PER_PAX = 6847;
  var PAT_MARGIN = 0.09;
  var MCAP_2025 = 179464;
  var CAGR_REF = 0.089;
  var state = { tpc: 0.22, years: 10, share: 0.60, pe: 39 };
  var $ = function (id) { return document.getElementById(id); };

  function fmtM(n) { return Math.round(n) + "M"; }
  function fmtPct(n) { return (n * 100).toFixed(1) + "%"; }
  function fmtMult(n) { return n.toFixed(2) + "x"; }
  function fmtCr(n) {
    if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " lakh cr";
    return "₹" + Math.round(n).toLocaleString("en-IN") + " cr";
  }

  function setYearsButton(years) {
    document.querySelectorAll("#indigo-growth-widget .igw-seg-btn").forEach(function (b) {
      b.classList.toggle("igw-seg-active", parseInt(b.getAttribute("data-years"), 10) === years);
    });
  }

  function compute() {
    var pop = POP_2025 + (POP_2035 - POP_2025) * (state.years / 10);
    var pax = pop * state.tpc;
    var ipax = pax * state.share;
    var cagr = Math.pow(pax / PAX_2025, 1 / state.years) - 1;
    var icagr = Math.pow(ipax / INDIGO_2025, 1 / state.years) - 1;
    var rev = ipax * REV_PER_PAX;
    var pat = rev * PAT_MARGIN;
    var mcap = pat * state.pe;

    var airbusEndpoint = PAX_2025 * Math.pow(1 + CAGR_REF, state.years);
    var airbusIndigo = airbusEndpoint * 0.60;
    var airbusMcap = airbusIndigo * REV_PER_PAX * PAT_MARGIN * 39;

    $("igw-pax").textContent = fmtM(pax);
    $("igw-ipax").textContent = fmtM(ipax);
    $("igw-cagr").textContent = fmtPct(cagr);
    $("igw-icagr").textContent = fmtPct(icagr);
    $("igw-rev").textContent = fmtCr(rev);
    $("igw-mcap").textContent = fmtCr(mcap);
    $("igw-pax-mult").textContent = fmtMult(pax / PAX_2025);
    $("igw-ipax-mult").textContent = fmtMult(ipax / INDIGO_2025);
    $("igw-rev-mult").textContent = fmtMult(rev / REV_2025);
    $("igw-mcap-mult").textContent = fmtMult(mcap / MCAP_2025);
    $("igw-cagr-ref").textContent = "vs 8.9%";
    $("igw-icagr-ref").textContent = "";

    $("igw-pax-bar").style.width = Math.min(100, (pax / (airbusEndpoint * 2)) * 100) + "%";
    $("igw-ipax-bar").style.width = Math.min(100, (ipax / (airbusIndigo * 2)) * 100) + "%";
    $("igw-cagr-bar").style.width = Math.min(100, (cagr / 0.20) * 100) + "%";
    $("igw-cagr-bar").style.background = cagr >= CAGR_REF ? "#6366f1" : "#a5a6f6";
    $("igw-icagr-bar").style.width = Math.min(100, (icagr / 0.20) * 100) + "%";
    $("igw-icagr-bar").style.background = icagr >= CAGR_REF ? "#6366f1" : "#a5a6f6";
    $("igw-rev-bar").style.width = Math.min(100, (rev / (airbusIndigo * REV_PER_PAX * 2)) * 100) + "%";
    $("igw-mcap-bar").style.width = Math.min(100, (mcap / (airbusMcap * 2)) * 100) + "%";

    $("igw-tpc-v").textContent = state.tpc.toFixed(2);
    $("igw-share-v").textContent = Math.round(state.share * 100) + "%";
    $("igw-yrs-v").textContent = state.years + "y";
    $("igw-pe-v").textContent = state.pe + "x";
    $("igw-tpc").value = state.tpc;
    $("igw-share").value = state.share;
    $("igw-pe").value = state.pe;
  }

  $("igw-tpc").addEventListener("input", function (e) { state.tpc = parseFloat(e.target.value); compute(); });
  $("igw-share").addEventListener("input", function (e) { state.share = parseFloat(e.target.value); compute(); });
  $("igw-pe").addEventListener("input", function (e) { state.pe = parseFloat(e.target.value); compute(); });
  document.querySelectorAll("#indigo-growth-widget .igw-seg-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.years = parseInt(btn.getAttribute("data-years"), 10);
      setYearsButton(state.years);
      compute();
    });
  });
  document.querySelectorAll("#indigo-growth-widget .igw-preset").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.tpc = parseFloat(btn.getAttribute("data-tpc"));
      state.years = parseInt(btn.getAttribute("data-years"), 10);
      state.share = parseFloat(btn.getAttribute("data-share"));
      state.pe = parseFloat(btn.getAttribute("data-pe"));
      setYearsButton(state.years);
      compute();
    });
  });

  compute();
})();
</script>

## Why India flies so little (and why that matters)

India is a country of roughly 1.45 billion people where fewer than 200 million domestic flights happen in a year. That's the same as 0.11 flights per person. For comparison:

| Country | Flights per person per year |
|---|---|
| **India** | **0.11** |
| Indonesia | 0.35 |
| China | 0.44 |
| Brazil | 0.45 |
| United States | 2.51 |

India today sits roughly where China sat in 2008-2010. If India simply grows toward half of where China is today over the next 10 years, the domestic flyer count nearly doubles. If it matches China, it quadruples. That is the runway the widget is modeling.

Sources: [World Bank](https://data.worldbank.org/indicator/IS.AIR.PSGR), [US BTS](https://www.transtats.bts.gov/), [Wikipedia Aviation in India](https://en.wikipedia.org/wiki/Aviation_in_India).

## Why IndiGo has 60% share

IndiGo is the market leader because it survived. Jet Airways collapsed in 2019. Go First grounded in May 2023 and never came back. SpiceJet runs at 3-4% share with a broken balance sheet. Akasa is growing but still small.

What IndiGo does right, in plain terms:

- Flies one aircraft type (the Airbus A320 family) so pilots, maintenance, and spare parts are shared across the whole fleet.
- Buys aircraft cheap and leases them to finance companies who lease them right back (keeps debt light on paper).
- Holds the best time-slots at Delhi, Mumbai, Bengaluru, which smaller rivals can't profitably match.

Current share trend:

| Month | IndiGo | Air India Group | Everyone else |
|---|---|---|---|
| Aug 2025 | 64.2% | 27.3% | 8.5% |
| Dec 2025 | 59.6% | 29.6% | 10.8% |

Source: [Wikipedia Aviation in India](https://en.wikipedia.org/wiki/Aviation_in_India). The December dip is from a crisis we cover below.

## Airports: the runway is being paved

India has about **150 commercial airports operating today**. The government's target is 200+ by the early 2030s, with UDAN-backed regional airports filling the gap.

The specific numbers that matter for IndiGo:

- Today's airport capacity: roughly **350 million passengers per year** across the top metros.
- New capacity by 2027: roughly **+100 million** (Navi Mumbai opened Dec 2025, Noida-Jewar launching now, Delhi T1 rebuild done, Bengaluru T2 Phase 2 coming).
- By 2035: cumulative additions pass **+200 million** as these new airports scale to full size.

In plain English: a country that handles ~184M domestic flyers today will soon have the runways, gates, and terminals to handle 500M+ without breaking. Slot scarcity, which has been IndiGo's quiet growth ceiling, is lifting right as its fleet deliveries ramp up. IndiGo is the designated launch carrier at Jewar alongside Akasa and Air India Express.

## Where IndiGo stands right now

**The five-year picture (consolidated, ₹ cr):**

| Fiscal | Revenue | Profit |
|---|---|---|
| FY21 (pandemic) | 14,641 | (5,806) |
| FY22 | 25,931 | (6,162) |
| FY23 | 54,446 | (306) |
| FY24 | 68,904 | 8,172 |
| FY25 | 80,803 | **7,258** |
| Last 12 months to Dec-25 | 84,675 | 3,211 |

The profit collapse in the last line is recent and deserves its own paragraph.

**What happened in December 2025.** India's aviation regulator (DGCA) introduced stricter crew-duty rules effective 2 December. IndiGo was understaffed for the new rules, cancelled about 4,500 flights in ten days, lost 717 airport time-slots to competitors, and booked a one-time hit of roughly ₹1,546 cr. Profit in the October-December 2025 quarter fell to **₹549 cr** from ₹2,448 cr a year earlier. The CEO, Pieter Elbers, resigned in March 2026. [Willie Walsh](https://en.wikipedia.org/wiki/Willie_Walsh), the outgoing head of the global airline industry body IATA, takes over as CEO in August 2026.

**The fleet.** 434 aircraft in August 2025, around 440 today. On order: roughly **900 more aircraft** spread across the next decade, the largest commercial aircraft order in history.

**The valuation today (22 April 2026):**

- Share price: ₹4,641 (52-week range ₹3,895-6,232, so about 25% below the high).
- Market cap: ₹1.79 lakh cr (roughly US$19 billion).
- P/E ratio: 39x last-twelve-month earnings.
- Promoter holding: 41.6% (down from ~70% three years ago as co-founder Rakesh Gangwal's family has sold down).

A P/E of 39x is richly valued for an airline. It means the market is paying for years of future growth, not for today's earnings alone.

## What could break the thesis

- **Fuel prices**. Jet fuel is 30-40% of an airline's costs and is priced in US dollars. A sustained oil spike compresses margins fast. IndiGo doesn't hedge fuel.
- **Rupee weakness**. Aircraft leases, fuel, and some maintenance are all dollar-linked. The rupee moved from ~83 to ~93 against the dollar over eighteen months, and that alone contributed to the Q3 FY26 profit drop.
- **Slot loss overhang**. The 717 slots IndiGo gave up in December are now being redistributed. How many come back matters a lot.
- **Air India is no longer a joke**. After the Tata takeover and merger with Vistara in late 2024, Air India has 189 aircraft, 570+ on order, and billions of rupees of fresh capital from Tata Sons and Singapore Airlines. It's still loss-making but it's no longer weak.
- **International expansion is unproven**. IndiGo's long-haul widebody aircraft (the A350) start arriving in 2027. Long-haul flying is a different business from cheap domestic hops, dominated by Gulf carriers and Singapore Airlines.
- **Regulator risk**. The same DGCA that fined IndiGo and took slots away can do more. A parliamentary panel summoned the airline after the December crisis.

## What to watch

**Signs the growth story is on track**: share recovers above 60% and stays there, quarterly profit returns to pre-crisis levels by FY27, A350 deliveries land on time in 2027.

**Signs it isn't**: share drifts below 55% for a year, profit margin stays compressed from fuel or rupee weakness, Air India's domestic share crosses 35%, or the A350 program slips by more than a year.

This post is not a buy, sell, or hold recommendation. The widget lets you plug in your own assumptions and see what they imply. The story beneath the widget is about whether those assumptions are defensible. Both parts matter.

**Sources and further reading:**

- [IndiGo investor relations](https://www.goindigo.in/information/investor-relations.html)
- [DGCA monthly market share](https://www.dgca.gov.in/digigov-portal/)
- [Airbus Global Market Forecast](https://www.airbus.com/en/products-services/commercial-aircraft/global-market-forecast)
- [World Bank air transport data](https://data.worldbank.org/indicator/IS.AIR.PSGR)

All figures as of 23 April 2026 unless noted.
