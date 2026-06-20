# Flying Car Business Simulator — Game Design Document
*Sprint 0 artifact. Last updated: 2026-06-20*

---

## 1. Premise

A famous inventor releases the flying car patent to the world. Governments are scrambling, traditional automakers are in defense mode, and the sky is suddenly open for business.

Each company receives **$100M in venture capital funding** and competes over **8 rounds (years)** to build the most valuable flying car company. The winner is determined by **Company Valuation Score** at the end of Year 8.

**Traditional cars are not a player option.** They are an ambient market force and competitive adversary that all players face — their market share shrinks as flying car adoption grows, and the traditional car lobby actively works against players via baseline negative policy pressure each year.

---

## 2. The Market

### 2.1 Total US Addressable Market

| Segment | Annual Units | Notes |
|---|---|---|
| Traditional cars (total US) | 18,000,000 | NPC adversary; declines as flying cars grow |
| Flying cars (base, Year 1) | 300,000 | ~Tesla-scale at launch |

### 2.2 Traditional Car Lobby (NPC Pressure)

The traditional car industry automatically lobbies against flying cars every year, creating a baseline negative force players must overcome:

- **Baseline NPC lobbying**: equivalent to -3 policy points per year
- Players must spend ~$3M in lobbying just to stay neutral
- This creates a "red queen" dynamic: you have to keep spending to hold ground

### 2.3 Flying Car Demand Growth

- **Base YoY growth**: +3% of prior year's total demand
- **Maximum growth cap per year**: `(e^0.15) - 1` ≈ **16.18%** above prior year
- **Category marketing effect**: Each $1M spent on *category* messaging → +0.01 increase to the growth exponent (wiped each year, must be repurchased)
- **Policy effect**: Each +5 policy points above 0 → +1% permanent demand increase for flying cars, -1% for traditional (stacks year over year)

### 2.4 Car Type Demand Matrix (Year 1)

Early flying car adopters skew urban, tech-forward, and affluent — so the Year 1 mix differs significantly from traditional car norms. The mix drifts toward mainstream norms as the market matures.

**Year 1: 300,000 total units by type × region**

| Type | West Coast (78K) | Northeast (66K) | Southeast (66K) | Midwest (54K) | Southwest (36K) | National | % |
|---|---|---|---|---|---|---|---|
| Compact | 27,300 (35%) | 26,400 (40%) | 14,520 (22%) | 11,880 (22%) | 10,080 (28%) | 90,180 | 30% |
| Sedan | 21,840 (28%) | 19,800 (30%) | 16,500 (25%) | 15,120 (28%) | 9,000 (25%) | 82,260 | 27% |
| SUV | 15,600 (20%) | 11,880 (18%) | 16,500 (25%) | 15,120 (28%) | 9,000 (25%) | 68,100 | 23% |
| Sports Car | 10,920 (14%) | 6,600 (10%) | 5,280 (8%) | 4,320 (8%) | 4,320 (12%) | 31,440 | 10% |
| Truck | 2,340 (3%) | 1,320 (2%) | 13,200 (20%) | 7,560 (14%) | 3,600 (10%) | 28,020 | 9% |

**Regional character (stable throughout the game):**
- West Coast & Northeast — urban, density-focused: compacts dominate, almost no trucks
- Southeast & Midwest — suburban/rural: trucks and SUVs are significant
- Southwest — balanced: no extreme skews, warm climate is favorable overall

### 2.5 Type Growth Modifiers (How the Mix Shifts Over 8 Years)

Applied on top of the overall market growth rate each year. Regional character percentages stay fixed; national mix drifts naturally via these modifiers.

| Type | Years 1–3 | Years 4–6 | Years 7–8 | Strategic Story |
|---|---|---|---|---|
| Compact | 1.2× | 1.0× | 0.9× | Enthusiast surge early, plateaus as market matures |
| Sedan | 1.0× | 1.0× | 1.0× | Steady — the reliable middle |
| SUV | 0.9× | 1.1× | 1.2× | Slow start, strong payoff as mainstream families adopt |
| Sports Car | 1.3× | 1.0× | 0.8× | Hottest early, cools as novelty fades |
| Truck | 0.7× | 1.0× | 1.4× | Skeptical utility buyers are last — then they arrive in force |

*Growth modifiers are never revealed directly to players. Teams infer them by observing results year over year. Market research R&D improves forward-looking demand estimates.*

### 2.6 Market Information Visibility

| Information | Always Visible | Requires Market Research ($1.5M R&D) |
|---|---|---|
| National demand by type (±10% approximate) | ✅ | |
| Regional breakdown by type | | ✅ |
| Next year's demand forecast per type/region | | ✅ |
| Type growth modifiers | Never revealed — inferred from results | |

### 2.5 US Sales Regions

Teams allocate production across **5 US regions**. Each region has distinct demand characteristics and price sensitivity.

| Region | % of National Demand | Price Sensitivity | Notes |
|---|---|---|---|
| West Coast (CA, OR, WA) | 26% | Low | High income, high tech adoption; premium pricing works |
| Northeast (NY, MA, CT, NJ) | 22% | Low-Medium | Dense urban; compact/sedan skew; airspace corridors open earlier |
| Southeast (FL, GA, TX, NC, SC) | 22% | Medium | Growing market; truck/SUV skew; warm climate favorable |
| Midwest (IL, OH, MI, IN, WI) | 18% | High | Traditional car stronghold; hardest to penetrate; price sensitive |
| Southwest (AZ, NV, CO, NM) | 12% | Medium | Emerging market; warm climate; strong growth trajectory |

**Regional allocation rules:**
- Teams choose what % of production to allocate to each region (must sum to 100%)
- Marketing spend can be targeted to specific regions for higher regional effectiveness
- World events may affect specific regions (e.g., an NYC corridor opening boosts Northeast)
- A team with no allocation in a region captures 0% of that region's demand

---

## 3. Win Condition

**Company Valuation Score** — calculated at end of each year (leaderboard) and final ranking at Year 8.

```
Valuation = (Annual Net Income × Growth Multiplier × 4)
          + (Cash on Hand × 1.0)
          + (Manufacturing Assets × 0.8)
          - (Outstanding Debt × 1.0)
          + (Brand Value Score × $500,000)
```

### Growth Multiplier (CAGR-based)

Uses **CAGR from Year 2 to the current year** — spans the whole game, can't be gamed with a single-year price dump.

```
CAGR = (Current Year Revenue / Year 2 Revenue)^(1 / years elapsed) - 1
```

*Year 1 is excluded because most teams will have $0 or minimal revenue while standing up factories. Teams with $0 Year 2 revenue default to 1.0× until they have a base.*

| CAGR | Growth Multiplier |
|---|---|
| > 25% | 2.5× |
| 15–25% | 2.0× |
| 5–15% | 1.5× |
| 0–5% | 1.2× |
| Negative | 1.0× |

**Example (Year 8):**
- Team A: $8M net income, CAGR -5% → Valuation ≈ $32M + assets
- Team B: $5M net income, CAGR +30% → Valuation ≈ $50M + assets
- Team B wins despite lower earnings — exactly like VC return logic.

### Leaderboard

Shown after every round. Columns:

| Rank | Company | Valuation | Revenue (This Year) | CAGR | Net Income | Market Share | Brand Score |
|---|---|---|---|---|---|---|---|

CAGR is the headline trajectory metric — teams can see at a glance who is building momentum vs. who has plateaued.

---

## 4. Starting Conditions (Year 1)

| Item | Value |
|---|---|
| Starting cash | $100,000,000 |
| Manufacturing space | None (must acquire) |
| Cars in portfolio | None (must design) |
| Policy score | 0 |
| Brand / public perception | 0 |
| Market share | 0% |
| Installed base (for repair revenue) | 0 |

---

## 5. Decision Categories

Decisions are submitted **once per round**. Each round represents one fiscal year.

---

### 5.1 Car Design

Teams can design one or more car models. A model persists year to year but can be updated (internals, features, pricing) each round without a full redesign fee. A full redesign (new type) costs a one-time engineering fee.

**Flying cars only.** Traditional cars are NPC adversaries, not a player option.

#### Vehicle Type

| Type | Base Manufacturing Cost | Engineering Redesign Fee | Notes |
|---|---|---|---|
| Compact | $42,000/unit | $3M | High volume, price sensitive |
| Sedan | $52,000/unit | $4M | Broad appeal |
| SUV | $68,000/unit | $5M | Premium, family market |
| Truck | $72,000/unit | $5M | Work/utility focused |
| Sports Car | $85,000/unit | $6M | Low volume, high margin |

#### Engine (cost added per unit)

| Option | Cost Adder | Effect |
|---|---|---|
| High Performance | +$9,000 | Demand ↑ in sports/SUV segments; fuel costs ↑ for buyers |
| Reliable | +$3,500 | Balanced; slight broad demand ↑ |
| Cheap | $0 | Reliability score ↓; recall risk ↑; repair revenue ↑ |

#### Internals (cost added per unit)

| Option | Cost Adder | Effect |
|---|---|---|
| Triple-tested custom parts | +$5,500 | Reliability ↑↑; recall risk ↓↓ |
| Mass-produced dependable parts | +$1,200 | Reliability ↑; recall risk ↓ |
| Low-grade, low-quality parts | $0 | Reliability ↓↓; recall risk ↑↑; repair revenue ↑ |

#### Bells & Whistles (each optional, stackable, per-unit cost)

| Feature | Cost Adder | Demand Effect |
|---|---|---|
| Touchscreen console | +$600 | +1% demand (all segments) |
| Lane assist | +$900 | +1.5% demand (safety-conscious) |
| Rear & side cameras | +$500 | +1% demand |
| High-quality speaker system | +$700 | +0.5% demand (luxury segments) |
| Full leather interior | +$1,400 | +2% demand (luxury); brand perception ↑ |
| Cell phone integration | +$400 | +1% demand (younger buyers) |
| Full virtual assistant | +$1,800 | +2% demand; premium perception ↑ |
| Entertainment system | +$1,100 | +1.5% demand (family/SUV) |

*Autonomous driving mode is an R&D unlock, not available by default.*

---

### 5.2 Production Decisions

Each round teams decide:

1. **How many units to manufacture** (up to manufacturing space capacity)
2. **How to allocate production across regions** (% per region, must sum to 100%)
3. **Sale price per model**

**Inventory mechanics:**
- Units produced but not sold become **inventory** (unsold stock)
- Carrying inventory costs **$800/unit/year** (storage, depreciation)
- Inventory can be sold next year but at reduced demand priority (buyers prefer new-year models)
- Teams can choose to **discount inventory** (lowers price for unsold units; moves stock but hurts brand perception slightly)

---

### 5.3 Manufacturing Space

Teams choose to **rent** or **buy**. They can upgrade in a later round. Selling owned space returns 70% of purchase price.

#### Rent

| Size | Capacity (units/year) | Annual Cost | Overhead/Unit |
|---|---|---|---|
| Small | 500 | $900,000 | $1,800 |
| Medium | 2,000 | $2,600,000 | $1,300 |
| Large | 6,000 | $6,500,000 | $1,083 |

#### Buy (capital outlay + annual maintenance)

| Size | Purchase Price | Capacity (units/year) | Annual Maintenance | Overhead/Unit |
|---|---|---|---|---|
| Small | $9,000,000 | 500 | $350,000 | $700 |
| Medium | $28,000,000 | 2,000 | $950,000 | $475 |
| Large | $65,000,000 | 6,000 | $2,200,000 | $367 |

*Note: Buying is better long-term but requires capital upfront. Renting preserves cash in early years. Owned space appears as an asset in valuation.*

---

### 5.4 R&D

Teams allocate R&D spending each round. Effects are applied the **following** year unless noted.

Teams can invest in multiple areas per round; costs are additive.

| Investment | Cost | Effect |
|---|---|---|
| Improve manufacturing efficiency | $4M | -5% per-unit manufacturing cost (stackable, cap: -35%) |
| Improve marketing effectiveness | $3M | +20% on next year's marketing spend dollar efficiency |
| **Unlock: Autonomous driving mode** | $12M one-time | Adds feature option to all models; demand ↑ in safety/tech segments |
| **Unlock: Fuel efficiency upgrade** | $7M one-time | Reduces fuel cost for buyers → demand ↑; West Coast especially |
| **Unlock: All-electric drivetrain** | $14M one-time | Opens EV segment; policy bonus +5; brand perception ↑ |
| Improve part dependability | $5M | Reliability score ↑; existing fleet -20% recall risk |
| Pricing research | $1M | Reveals competitors' average sale prices this round |
| Competitor research | $2M | Reveals one competitor's production volume and vehicle type |
| Market research | $1.5M | Reveals next year's demand forecast per region with higher accuracy |

---

### 5.5 Policy / Lobbying

**Policy Score**: -50 to +50, shared across all players, persistent.

Traditional car NPC lobby contributes **-3 points/year automatically**.

| Score | Effect |
|---|---|
| -50 | Flying cars outlawed — flying car sales = 0 |
| -40 | Severe purchase restrictions; 30% tax on all flying car sales |
| -30 | Personal liability for all accidents; insurance costs ↑↑ |
| -20 | Sweeping regulations; compliance costs ↑; demand ↓ |
| -10 | Incentives to buy traditional cars |
| 0 | No change |
| +10 | Tax breaks for flying car purchases; demand ↑ |
| +20 | Loosened airspace restrictions; demand ↑↑ |
| +30 | Government research grants; R&D costs -20% for all |
| +40 | Heavy taxation on traditional cars; demand ↑↑↑ |
| +50 | Traditional cars effectively banned in key urban zones |

**Lobbying mechanics:**
- Each $1M → +1 policy point (diminishing returns: above $10M/round, each additional $2M = +1 point)
- All players' lobbying is **aggregated** — the net change moves the shared dial
- Lobbying also **weights the world event pool** (see Section 9)
- Players can lobby in either direction (pro or anti-flying car); anti-flying lobbying is rare but theoretically available as sabotage

---

### 5.6 Marketing

#### Messaging Type (choose one per campaign)
- **Category-focused**: grows total flying car market demand (shared benefit; goodwill play)
- **Brand-focused**: captures more of existing demand for your company specifically

#### Tone (choose one)
- **Positive**: builds your brand perception score
- **Attack**: targets a named competitor; reduces their brand perception by half the effect; 20% chance it backfires and reduces your own perception instead

#### Tactic (budget can be split across any combination)

| Tactic | Minimum Spend | Strengths | Weaknesses |
|---|---|---|---|
| TV / Online Video | $2M | High reach; best for brand and category | Expensive per point |
| Radio | $500K | Cost-efficient; good for regional | Low conversion |
| Print | $300K | Targeted; good for niche segments | Low reach |
| Paid Search | $800K | High conversion; region-targetable | Weak for brand-building |

#### Regional targeting
- Marketing spend can be national (split evenly) or allocated to specific regions
- Regional spend is more efficient in that region (+20% effectiveness) but misses others

**Marketing share formula:**
```
Your brand demand share in a segment =
  (your brand marketing spend × effectiveness multiplier)
  ÷ (sum of all competitors' brand marketing in that segment)
```

---

## 6. Demand Allocation Model

### 6.1 How market share is determined

Each round, for each car type × region combination:

1. Calculate total regional demand (national demand × regional % share × growth × policy factor)
2. Each team competing in that region+type gets a **demand score**:

```
Demand Score =
    Brand_multiplier             (from perception score, 0.5–1.5×)
  × Price_elasticity_factor      (your price vs. segment average; see 6.2)
  × Quality_score                (engine + internals + features composite)
  × Marketing_share              (your regional brand spend / total regional brand spend)
```

3. Scores are normalized to 100% across all competitors in that region+type
4. Units demanded from you = your share × total segment demand in that region
5. Units sold = min(units demanded, your regional production allocation)
6. Unsatisfied demand redistributes to competitors proportionally

### 6.2 Price Elasticity by Segment

| Segment | Elasticity | Notes |
|---|---|---|
| Compact | High | Price sensitive; undercutting has big upside |
| Sedan | Medium | Balanced price/quality decision |
| SUV | Medium-Low | Some luxury appeal; quality matters more |
| Truck | Low | Use-case-driven, loyal buyers; quality and reliability win over price |
| Sports Car | Inverted (prestige) | See below — pricing low *hurts* demand |

**Truck strategic identity:** Low volume, low price sensitivity, premium margins, and higher repair revenue from a hard-working installed base. The truck strategy is a lean, high-margin niche play — small manufacturing footprint, strong profit per unit, growing repair revenue. Competes on quality and reliability, not price.

**Standard price elasticity factor (all types except sports car):**
```
factor = 1.0 + elasticity_coefficient × (segment_avg_price - your_price) / segment_avg_price
```
- Compact elasticity coefficient: 1.5
- Sedan: 1.0
- SUV: 0.7
- Truck: 0.5

**Sports Car prestige pricing (inverted elasticity):**

Sports car buyers interpret a low price as a signal of low quality. The demand curve partially inverts:

```
If your_price > segment_avg_price:
    prestige_bonus = min(0.15, 0.375 × (your_price - avg) / avg)  # up to +15% demand at 40% above avg

If your_price < segment_avg_price:
    cheapness_penalty = 0.5 × (avg - your_price) / avg             # -5% demand per 10% below avg
```

Pricing a sports car significantly below the market average actively destroys demand. Pricing above it — up to a ceiling — signals exclusivity and boosts demand.

### 6.3 Brand Multiplier by Segment

Brand perception affects demand differently across vehicle types. Sports cars are the most brand-sensitive segment in the game.

```
Brand_multiplier = 1.0 + (brand_perception / sensitivity_divisor)
```

| Type | Sensitivity Divisor | Range | Logic |
|---|---|---|---|
| Compact | 250 | 0.6× – 1.4× | Buyers care about price, not image |
| Sedan | 200 | 0.5× – 1.5× | Standard |
| SUV | 175 | 0.43× – 1.57× | Slightly prestige-sensitive |
| Truck | 200 | 0.5× – 1.5× | Reputation for reliability, not glamour |
| Sports Car | 100 | **0.1× – 2.0×** | Brand IS the product — floors at 0.1× |

A sports car company at +80 brand perception sells at 1.8× baseline demand. At -50, they're nearly out of business in the segment. The 0.1× floor means recovery is possible but brutal.

### 6.4 Marketing Channel Effectiveness by Segment

Not all marketing channels work equally well for every vehicle type. Sports cars especially reward prestige channels.

| Channel | Compact | Sedan | SUV | Truck | Sports Car |
|---|---|---|---|---|---|
| TV / Online Video | 1.0× | 1.0× | 1.0× | 1.0× | 1.5× |
| Radio | 1.0× | 1.0× | 0.9× | 1.1× | 0.7× |
| Print | 0.8× | 1.0× | 1.1× | 0.9× | 1.5× |
| Paid Search | 1.2× | 1.1× | 1.0× | 1.0× | 0.5× |

Sports car brands are built through prestige media (TV, print). Paid search is nearly useless — enthusiast buyers aren't Googling deals. Trucks respond well to radio (working buyers). Compacts benefit most from search (price-comparison shoppers).

---

## 7. Perception — Two Distinct Systems

### 7.1 Public Perception (Industry-Level)

**What it is:** How the general public views *flying cars as a concept* — shared across all players, not tied to any one company.

**Scale: -100 to +100**

| Entity | Starting Value |
|---|---|
| Flying cars (industry) | 30 |
| Traditional cars (industry) | 0 |

Flying cars start with a +30 head start — the public is excited about the technology at launch.

**What moves it:**
- Positive category marketing (all players benefit)
- World events (crash → drops; corridor opening → rises)
- Policy score (high policy = public sees flying cars as legitimate → perception ↑)
- Recalls across the industry (systemic quality problems drag it down for everyone)

**Effect on policy:**
```
Every 10 points of flying car Public Perception above 0 → +2 policy points
```
This creates a feedback loop: high public support nudges governments toward pro-flying-car policy, which in turn drives more demand. Losing public trust is hard to recover from.

---

### 7.2 Brand Perception (Company-Level)

**What it is:** How customers view *your specific company* — each team has their own score.

**Scale: -100 to +100** (starts at 0 for all companies)

**What moves it up:**
- High-quality internals (triple-tested)
- Premium features (leather, virtual assistant)
- Positive brand marketing campaigns
- R&D investment (+2 perception per $5M R&D)
- Zero recalls in prior year
- Public Perception above 30 (industry enthusiasm lifts all brands slightly)

**What moves it down:**
- Recalls / high repair rates (low-quality internals + cheap engine)
- Negative world events targeting your segment
- Competitor attack ads
- Product failures

**Annual brand perception change formula:**
```
Δ brand_perception = marketing_effect
                   + quality_effect       (internals + engine composite)
                   - recall_penalty       (0 if no recalls; -5 to -25 based on scale)
                   + innovation_effect    (R&D spend signal)
                   + industry_spillover   (public_perception > 30 → +1)
                   + event_effect
```

**Effect on demand:**
```
Brand_multiplier = 1.0 + (brand_perception / 200)
```
Range: 0.5× (at -100) to 1.5× (at +100)

---

## 8. Revenue Streams

### 8.1 Vehicle Sales
```
Revenue = Units Sold × Sale Price
COGS = (Manufacturing Base Cost + Engine + Internals + Features) × Units Sold
Gross Profit = Revenue - COGS - Manufacturing Space Cost
```

### 8.2 Reliability Score

Each vehicle model carries a **Reliability Score** derived from parts and engine choices. It is the bridge between production decisions and brand perception — the mechanism that ensures cheap parts never become a free money strategy.

```
Reliability Score = Parts_Base × Engine_Modifier

Parts base:
  Triple-tested custom parts:    2.0
  Mass-produced dependable:      1.0
  Low-grade, low-quality:        0.5

Engine modifier:
  High Performance:  × 0.9   (performance stress reduces reliability)
  Reliable:          × 1.2
  Cheap:             × 0.7
```

**How reliability drives fleet repair rate:**
```
Fleet_Repair_Rate = Base_Repair_Rate(type) / Reliability_Score
```

| Type | Base Repair Rate |
|---|---|
| Compact | 7% |
| Sedan | 8% |
| SUV | 9% |
| Sports Car | 8% |
| Truck | 12% |

**How fleet repair rate feeds brand perception (annual):**

| Fleet Repair Rate | Brand Perception Hit | Additional Effect |
|---|---|---|
| ≤ 10% | None | — |
| 11–15% | -5/year | — |
| 16–20% | -10/year | Recall event: -5 extra, mentioned in trade report |
| > 20% | -15/year | Major recall: -10 extra, front-page trade headline (public) |

Recalls are **publicly reported** in the Round Report. Competitors see when you have quality problems — and they don't see your parts quality choice, only the downstream consequence.

The razors/blades play (low-grade parts for repair revenue) is most viable in compact where brand sensitivity is lowest, and nearly suicidal in sports cars where the brand multiplier swings from 0.1× to 2.0×.

### 8.3 Parts & Repair Revenue

```
Annual Repair Revenue = Installed_Base × Fleet_Repair_Rate × Avg_Repair_Value
Avg_Repair_Value: $2,400/repair
```

Repair revenue compounds quietly as your installed base grows — even a small fleet of trucks at 12% base repair rate generates meaningful revenue in Years 5–8.

### 8.4 Inventory

Unsold units carry over to the following year with storage and depreciation costs.

```
Annual Inventory Carrying Cost = Unsold_Units × $800/unit
```

Inventory can be sold in the following year but at **reduced demand priority** — buyers prefer current-year models. Teams may choose to **discount inventory** (reduce price on unsold stock) to move it faster; discounting below market average carries the same cheapness signal as regular underpricing for that segment.

**Unmet demand reporting:** After each round, teams see exactly what they left on the table:
- Units of unmet demand (by model and region)
- Estimated gross profit missed
- Whether that demand was captured by a competitor or simply went unserved

This makes capacity decisions feel consequential in both directions — overproduction costs you storage; underproduction shows you the specific opportunity you missed.

### 8.5 Technology Licensing *(Phase 2)*
- Teams that unlock autonomous driving or all-electric can offer licenses to competitors
- Deferred from MVP to keep the engine simpler

---

## 9. World Events

### How it works

- One event is drawn at the **start of each round**, before decisions are submitted
- Teams see the event and must factor it into their decisions
- Events are drawn from a **weighted random pool**
- The **current policy score** influences which category of event is more likely
- Teams that have **lobbied heavily** in prior years have a small chance to "steer" toward a favorable event (see below)

### Event Pool Categories

| Category | Favored by Policy Score | Examples |
|---|---|---|
| Regulatory / Pro-Flying | Policy > +10 | FAA corridor opens, airspace deregulation, tax credits |
| Regulatory / Anti-Flying | Policy < -10 | Accident liability law, purchase tax, safety mandate |
| Economic | Any | Recession, boom, interest rate shift |
| Technological | High R&D investment across players | Battery breakthrough, rare earth shortage, supply chain disruption |
| Competitive | Any | NPC traditional car price war, new foreign flying car entrant |
| Environmental | Any | Wildlife protection law, noise ordinance, green mandate |
| Opportunity | Policy > +20 | Government contract tender, tech company partnership bid |

### Lobbying Steering Mechanic

- A team that has spent **$8M+ on lobbying** in the current round can flag **one preferred event category**
- If that category is drawn (weighted by policy), the specific event within it is more favorable to that team
- Not guaranteed — it's influence, not control
- Multiple teams can flag preferences; the most-invested team's preference wins ties

### Sample Event Pool (30+ events in full game)

| Event | Category | Policy Trigger | Effect |
|---|---|---|---|
| FAA Opens Urban Test Corridors | Regulatory/Pro | Policy ≥ 0 | Flying car demand +5%; policy +3 |
| Major Flying Car Crash (NPC) | Regulatory/Anti | Any | All-market demand -8%; safety R&D value ↑; recall risk +5% for low-quality builders |
| Rare Earth Shortage | Technological | Any | Manufacturing cost +12% all teams; lasts 1 year |
| Recession | Economic | Any | Overall demand -15%; price sensitivity ↑ across all segments |
| EV Tax Credit Expansion | Regulatory/Pro | Policy ≥ +10 | All-electric unlock cost -40%; EV demand +10% |
| Traditional Automaker Price War | Competitive | Any | Traditional car demand recovers +5%; flying car demand -3% |
| Urban Air Mobility Corridor Opens (Northeast) | Opportunity | Policy ≥ +15 | Northeast demand +20%; compact/sedan ↑ |
| Wildlife Protection Regulations | Environmental | Any | Flying cars require new compliance module (+$1,200/unit cost); policy -5 |
| Government Fleet Contract (Opportunity) | Opportunity | Policy ≥ +20 | Teams can bid; winner gets 500-unit government order at fixed price |
| Foreign Flying Car Entrant | Competitive | Any | New NPC competitor enters one region with cheap product; price pressure ↑ |
| Battery Breakthrough | Technological | High R&D env | All-electric manufacturing cost -20%; fuel efficiency upgrade cost -30% |
| Insurance Industry Lobbies Against Flying Cars | Regulatory/Anti | Policy < +10 | Insurance costs ↑ for buyers; demand -5%; policy -3 |
| Tech Giant Partnership Auction | Opportunity | Policy ≥ +20 | Teams bid; winner gets +25% marketing effectiveness for 2 years |
| Noise Ordinance (Urban) | Environmental | Any | Northeast/West Coast demand -8%; companies with Fuel Efficiency unlock exempt |
| Boom Economy | Economic | Any | Overall demand +10%; price sensitivity ↓; premium segments ↑ |

---

## 10. Roles Within Teams

| Role | Primary Decisions |
|---|---|
| CEO | Final decision submission, lobbying strategy, regional market entry |
| CFO | Budget allocation, sale pricing, inventory discount decisions |
| CMO | Marketing spend, messaging type, tactic and regional allocation |
| CTO | R&D investments, vehicle feature selection, model design changes |
| COO | Manufacturing space decisions, production volume, supply allocation |

**Rules:**
- Only **CEO** can submit the final round decision package
- Each role can edit their section independently before CEO locks it
- For teams with fewer than 5 members, roles are combined (CEO handles any unclaimed section)
- In party mode, a timer shows per-round; CEO sees a live status of which roles have completed their section

---

## 11. Competitive Scarcity Mechanics

All scarcity effects resolve **after all teams submit simultaneously** — the engine aggregates industry behavior first, then applies effects. No ordering advantage exists within a round. The strategic skill is **predicting** what competitors will do before you lock in.

### 11.1 Parts Supply Chain Pressure

Global parts supply is finite. When aggregate industry demand for a quality tier exceeds thresholds, unit costs rise for every team using that tier — including you.

| Parts Tier | Threshold | Cost Penalty |
|---|---|---|
| Triple-tested custom | >6,000 units industry-wide | +$2,000/unit |
| Triple-tested custom | >12,000 units industry-wide | +$5,000/unit |
| Mass-produced dependable | >30,000 units industry-wide | +$800/unit |
| Low-grade | No scarcity | None |

If five teams race to triple-tested parts at scale, costs spike for all of them. The game theory: defecting to mass-produced while competitors overpay for premium parts is a legitimate strategy.

### 11.2 Segment Crowding

When too many teams target the same vehicle type, the market gets noisy and brand signals cancel out.

| Teams in same type segment | Effect |
|---|---|
| 1–2 | No penalty |
| 3 | Brand marketing 15% less effective in that segment |
| 4+ | Brand marketing 30% less effective + segment avg price forced down 8% |

Crowding compounds on top of the natural demand scarcity from sharing a fixed market. The team that finds an underserved segment earns a clean competitive signal. Six teams building compacts is a race to the bottom.

### 11.3 Regional Overproduction (Market Glut)

When total industry production allocated to a region exceeds regional demand, the market forces prices down for everyone selling there.

```
If industry supply in region > regional demand:
    glut_ratio = supply / demand
    forced_price_discount = (glut_ratio - 1.0) × 40%
    applied to ALL teams selling in that region
```

A 20% regional oversupply forces an 8% price discount on everyone — including teams that produced conservatively. Regional allocation is a prediction game: you want to ship where competitors aren't.

### 11.4 R&D First-Mover Exclusivity

The first team to invest in a major R&D unlock gets an exclusive window before competitors can access it. Exclusivity is measured **across rounds**, not within a round.

| Unlock | Exclusive Window | Competitor options during window |
|---|---|---|
| Autonomous driving | 2 years | Develop independently (+60% cost), or license from pioneer |
| All-electric drivetrain | 2 years | Same |
| Fuel efficiency upgrade | 1 year | Same |

**Tiebreaker rule:** If two teams invest in the same unlock in the same round, both unlock it simultaneously — no exclusivity granted. The window only opens when one team is clearly one full round ahead.

**Pioneer's choice:** License your unlock to competitors (annual fee, your choice of price) or withhold it as a competitive moat. Withholding is riskier — competitors will develop independently eventually.

**Reverse-engineering:** Teams can observe competitors' results and infer what they've unlocked. A sudden spike in a competitor's compact demand suggests autonomous driving. A brand perception jump with no marketing increase suggests a quality R&D investment. Reading the signals is a skill.

### 11.5 Talent War

There is a finite pool of top engineering, design, and R&D talent. Heavy industry-wide R&D spend drives up costs and reduces efficiency for everyone.

```
If aggregate industry R&D spend in a round > $25M:
    excess = total_industry_R&D - $25M
    efficiency_penalty = min(0.30, excess / $25M × 0.20)
    every team's R&D buys (1 - efficiency_penalty) of its normal effect
```

Being the only team doing serious R&D means your dollars go further. When everyone piles in simultaneously, every team gets less for their money.

### 11.6 Information Asymmetry

| Known before submitting | Unknown until results |
|---|---|
| Prior year leaderboard (revenue, CAGR, market share, brand) | Competitors' current-round decisions |
| Competitor pricing (if Pricing Research R&D purchased) | Their parts tier this round |
| One competitor's production volume + type (if Competitor Research purchased) | Their regional allocation |
| R&D unlocks competitors visibly have (from past results) | Their R&D investments this round |
| Public perception scores | Their marketing spend and channel mix |

Narrowing this gap — through R&D research investments or careful observation of results — is a legitimate competitive strategy.

---

## 12. The Round Report — Industry Trade Publication

After every round resolves, all teams receive a generated industry trade report before planning their next decisions. It functions like a real trade publication (think Automotive News, Aviation Week) — covering what the industry can genuinely observe, not what happens behind closed doors.

**Governing principle: narrative realism.** If it would realistically appear in an industry trade publication, it's reported. If it wouldn't, it stays private.

### 12.1 Always Reported (Public Information)

| Event | Example Headline / Blurb |
|---|---|
| Factory opened / expanded / closed | *"Apex Flying Cars opens medium-capacity facility in Seattle"* |
| New car model launched | *"SkyDrive Motors unveils its first flying SUV"* |
| R&D unlock manifests as a product | *"CloudRoad Inc. becomes first to achieve autonomous flight certification"* |
| Market demand numbers and segment shifts | *"Flying car market reaches 340,000 units; compact segment leads growth"* |
| Policy changes and lobbying outcomes | *"Congress passes flying car purchase tax credit; analysts forecast demand surge"* |
| World event that fired this round | *"Rare earth shortage disrupts global supply chains"* |
| Brand / public perception swings | *"Consumer confidence in flying car safety reaches new high"* |
| Scarcity effects (narrative, not numbers) | *"R&D talent competition intensifies as engineering salaries rise across the industry"* |
| Regional price movements | *"West Coast compact flying car prices soften amid increased competition"* |
| Segment crowding signal | *"Compact segment sees surge of new entrants; analysts warn of price war"* |

### 12.2 Always Private (Never Reported)

- Budget allocation and spend breakdown
- Parts quality tier chosen
- Marketing spend amounts and channel mix
- Exact production volumes (leaderboard publishes outcomes, not inputs)
- R&D investment amounts (only the output — the product — becomes visible)
- Regional allocation specifics
- Pricing decisions (only visible after sales clear, or via Competitor Research R&D)

### 12.3 Tone and Format

Professional and dry — not sensationalist. The publication reports facts and quotes analysts. Teams read it to build their competitive picture; the gaps are where strategy lives.

The leaderboard (Valuation, Revenue, CAGR, Market Share, Brand Score) publishes alongside the report — it shows outcomes. The trade report explains the narrative around those outcomes without revealing exactly how competitors achieved them.

---

## 13. Confirmed Decisions

| # | Decision | Resolved |
|---|---|---|
| 1 | Traditional cars are NPC adversaries, not player options | ✅ |
| 2 | Teams decide production quantity + regional allocation | ✅ |
| 3 | World events are random pool, policy-weighted | ✅ |
| 4 | Growth Multiplier uses CAGR (Year 2 → current year); CAGR also shown on leaderboard | ✅ |
| 5 | Total market = 18M; category marketing threshold = $1M per +0.01 exponent | ✅ |
| 6 | Two perception systems: Public (industry, starts at 30 for flying cars) + Brand (company, starts at 0) | ✅ |
| 7 | Public Perception feeds into Policy: every 10 pts above 0 → +2 policy points | ✅ |
| 8 | Car type demand matrix locked (Year 1 by type × region); type growth modifiers defined | ✅ |
| 9 | Truck strategy: low volume, low price elasticity, premium margins, 12% base repair rate | ✅ |
| 10 | Sports car: steepest brand curve (0.1×–2.0×), prestige pricing inversion, TV/print 1.5× effective | ✅ |
| 11 | Five competitive scarcity mechanics: parts supply, segment crowding, regional glut, R&D first-mover, talent war | ✅ |
| 12 | All scarcity resolves post-simultaneous-submission; strategic skill is competitor prediction | ✅ |
| 13 | Round Report: industry trade publication format; narrative realism governs what's public vs. private | ✅ |
| 14 | Attack ads: included, with 20% backfire risk | ✅ |
| 15 | Repair revenue: included; reliability score bridges parts quality → brand perception; recalls are public | ✅ |
| 16 | Technology licensing: Phase 2 | ✅ |
| 17 | Inventory carries over at $800/unit/year; unmet demand reported to teams after each round | ✅ |
| 18 | Foreign NPC competitor: world event only; traditional car lobby is sufficient permanent NPC pressure | ✅ |
| 19 | Anti-flying lobbying: dropped — thematically incoherent, strategically dominated by pro-flying spend | ✅ |

---

---

## 13. Sprint Roadmap

| Sprint | Focus | Status |
|---|---|---|
| Sprint 0 | Game Design Document | 🔄 In progress |
| Sprint 1 | Tech stack, scaffolding, GitHub repo | Pending |
| Sprint 2 | Database schema + auth | Pending |
| Sprint 3 | Game & team management | Pending |
| Sprint 4 | Decision submission UI | Pending |
| Sprint 5 | Simulation engine | Pending |
| Sprint 6 | Results & dashboards | Pending |
| Sprint 7 | Party mode (real-time timers, live status) | Pending |
| Sprint 8 | World events system | Pending |
| Sprint 9 | Deploy & playtest | Pending |
