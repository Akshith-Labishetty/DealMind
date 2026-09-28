// Realistic synthetic demo data for DealMind.

export const DEMO_ACME = {
  company: 'Acme Technologies',
  industry: 'Enterprise SaaS',
  contactName: 'Sarah Mitchell',
  contactRole: 'CTO',
  title: 'Enterprise Software Platform',
  plan: 'Enterprise',
  value: 75000,
  stage: 'Negotiation',
  summary:
    'Acme Technologies is evaluating our Enterprise Software Platform to replace a patchwork of internal tools. Sarah Mitchell (CTO) is the champion; procurement joined late and controls the commercial decision. Security review went well, pricing is the open battle, and CloudCore is the incumbent alternative.',
  nextMeetingAt: '2026-09-29T15:00:00.000Z',
  interactions: [
    {
      date: '2026-09-03',
      type: 'Discovery',
      participants: ['Sarah Mitchell (CTO)', 'James Okafor (VP Engineering)'],
      notes: `Initial discovery call with Acme Technologies. Sarah said they are actively evaluating the Enterprise plan to replace three internal tools before Q1. Must-have: REST API integration with their existing data warehouse and SSO via Okta. They are running a competitive evaluation with at least two other vendors and want to make a decision this quarter. Budget ballpark discussed at roughly $70-80k. James asked who our biggest enterprise customers are.`
    },
    {
      date: '2026-09-09',
      type: 'Commercial',
      participants: ['Sarah Mitchell (CTO)', 'Priya Raman (Finance Director)'],
      notes: `Commercial discussion. Sarah said the Enterprise price is still above their expected budget — $75k is ~15% over what Finance approved for this initiative. Priya wants a 12-month ramp or a phased rollout option. Sarah was clear that she loves the product but cannot justify the number without a concession. Also asked about deployment options: they need a US data residency region and are not comfortable with multi-tenant shared infra.`
    },
    {
      date: '2026-09-10',
      type: 'Security',
      participants: ['Sarah Mitchell (CTO)', 'Marco Ruiz (Security Lead)'],
      notes: `Security deep-dive with Marco. Their CTO-level requirement is SOC 2 Type II compliance evidence — this is a hard gate for procurement. Walked through our encryption at rest/in transit, RBAC and audit logging. Marco said the security discussion went very well and our audit log granularity is better than the alternatives they saw. No open security concerns remaining. Asked for the current SOC 2 Type II report under NDA.`
    },
    {
      date: '2026-09-16',
      type: 'Technical',
      participants: ['James Okafor (VP Engineering)', 'Sarah Mitchell (CTO)'],
      notes: `Competitive discussion. James mentioned CloudCore by name — their team trialled CloudCore last month and liked its pricing but found the API rate limits painful. Sarah wants an architecture review of how our API handles bulk sync. Security topic came up again and was treated as a solved problem. Pricing is still unresolved and Sarah asked us to come back with a revised commercial proposal after the architecture review.`
    },
    {
      date: '2026-09-23',
      type: 'Follow-up',
      participants: ['Sarah Mitchell (CTO)', 'Daniel Choi (Procurement)', 'James Okafor (VP Engineering)'],
      notes: `Procurement is now formally involved — Daniel Choi is running the vendor selection paperwork. Customer requested full API documentation and wants a technical proof of concept: a two-week POC syncing their warehouse into our platform. Procurement wants the revised pricing proposal by end of next week. Sarah reiterated that security is closed and pricing is the only remaining blocker on her side.`
    }
  ]
};

export const OTHER_DEALS = [
  {
    company: 'Nova Systems',
    industry: 'Logistics',
    contactName: 'Elena Vasquez',
    contactRole: 'Head of Operations',
    title: 'Professional Analytics Suite',
    plan: 'Professional',
    value: 28000,
    stage: 'Proposal',
    summary:
      'Nova Systems wants routing analytics for their regional fleet. Elena is the champion, IT has not been engaged yet, and the proposal is with their leadership for a yes/no.',
    nextMeetingAt: '2026-10-02T14:00:00.000Z',
    interactions: [
      {
        date: '2026-09-04',
        type: 'Discovery',
        participants: ['Elena Vasquez (Head of Operations)'],
        notes: `Elena described their routing pain: 12 regional depots, manual Excel planning, ~9% wasted mileage. Interested in the Professional plan, specifically route optimisation dashboards. Wants a live demo with real depot data before involving IT.`
      },
      {
        date: '2026-09-11',
        type: 'Technical',
        participants: ['Elena Vasquez', 'Tom Beckett (IT Manager)'],
        notes: `IT joined late. Tom raised an integration concern: they run an on-prem TMS and want to know whether we offer a flat-file or SFTP import path, since they will not expose an API. Confirmed we support scheduled CSV imports. Tom seemed satisfied but asked for a sandbox tenant.`
      },
      {
        date: '2026-09-18',
        type: 'Commercial',
        participants: ['Elena Vasquez'],
        notes: `Sent the Professional proposal at $28,000 annually. Elena said the price is acceptable to her but must be approved by their COO. No objections raised. Positive signal: she asked about onboarding timelines for a November start.`
      }
    ]
  },
  {
    company: 'Vertex Labs',
    industry: 'Biotech Research',
    contactName: 'Dr. Aisha Kapoor',
    contactRole: 'Director of Research Informatics',
    title: 'Enterprise Platform + Data Warehouse Add-on',
    plan: 'Enterprise',
    value: 120000,
    stage: 'Discovery',
    summary:
      'Large Enterprise opportunity, still early. Vertex Labs is comparing us against an incumbent analytics vendor and is sensitive to research-data compliance requirements.',
    nextMeetingAt: '2026-10-06T16:00:00.000Z',
    interactions: [
      {
        date: '2026-09-08',
        type: 'Discovery',
        participants: ['Dr. Aisha Kapoor', 'Ben Liu (Data Engineer)'],
        notes: `First call. Aisha needs lineage tracking for regulated research data and HIPAA-aware handling of participant metadata. $120k budget is real but unspent. They asked how we compare to their current incumbent analytics vendor.`
      },
      {
        date: '2026-09-15',
        type: 'Technical',
        participants: ['Ben Liu (Data Engineer)'],
        notes: `Ben validated our ingestion model and liked the dbt integration. He flagged that their security questionnaire (CAIQ v4) must be completed before any trial. Noted that the incumbent vendor offered a 40% discount in their last renewal — competitive pricing pressure is real.`
      },
      {
        date: '2026-09-22',
        type: 'Follow-up',
        participants: ['Dr. Aisha Kapoor'],
        notes: `Sent CAIQ questionnaire and architecture overview. Aisha confirmed legal review starts in two weeks. No pricing discussion yet. Asked for references from two other biotech customers.`
      }
    ]
  },
  {
    company: 'Orion Retail Group',
    industry: 'Retail',
    contactName: 'Marcus Webb',
    contactRole: 'VP Digital',
    title: 'Enterprise Platform (Store Ops)',
    plan: 'Enterprise',
    value: 96000,
    stage: 'Negotiation',
    summary:
      'Negotiation stage with an active competitor threat. Marcus is supportive but their procurement team is pushing hard on price and contractual flexibility.',
    nextMeetingAt: '2026-09-30T17:00:00.000Z',
    interactions: [
      {
        date: '2026-09-02',
        type: 'Discovery',
        participants: ['Marcus Webb (VP Digital)', 'Rita Anand (Store Systems)'],
        notes: `Rollout scope: 240 stores, store-ops reporting. Marcus wants quarterly business reviews baked into the contract. Budget approved at $96k.`
      },
      {
        date: '2026-09-12',
        type: 'Commercial',
        participants: ['Marcus Webb', 'Procurement (Helen Ward)'],
        notes: `Helen pushed hard: wants monthly billing instead of annual prepay and a 60-day termination-for-convenience clause. Competitor "Fluxboard" offered a similar product at 20% less. Marcus is still on our side but needs a business case to defend the premium.`
      },
      {
        date: '2026-09-19',
        type: 'Follow-up',
        participants: ['Marcus Webb'],
        notes: `Sent revised order form with monthly billing accepted and termination clause limited to material breach. Marcus said this is "close" and wants to sign before their fiscal quarter ends on Sept 30.`
      }
    ]
  },
  {
    company: 'Beacon Health',
    industry: 'Healthcare Services',
    contactName: 'Dr. Naomi Chen',
    contactRole: 'Chief Medical Information Officer',
    title: 'Professional Platform (Pilot)',
    plan: 'Professional',
    value: 42000,
    stage: 'Technical Evaluation',
    summary:
      'Pilot-driven evaluation in a regulated environment. Clinical stakeholder buy-in is strong; compliance evidence is the gating item.',
    nextMeetingAt: '2026-10-01T15:00:00.000Z',
    interactions: [
      {
        date: '2026-09-05',
        type: 'Discovery',
        participants: ['Dr. Naomi Chen'],
        notes: `Naomi wants to pilot the Professional platform for two clinics (~60 users). Success criteria: reduce report turnaround from 3 days to same-day.`
      },
      {
        date: '2026-09-17',
        type: 'Security',
        participants: ['Dr. Naomi Chen', 'Omar Farouk (Compliance)'],
        notes: `Compliance gate: they require a signed BAA and HIPAA addendum before the pilot starts, plus SOC 2 evidence. Omar said our audit logging met their baseline. The BAA is with their legal team now.`
      },
      {
        date: '2026-09-24',
        type: 'Technical',
        participants: ['Dr. Naomi Chen', 'Clinic IT'],
        notes: `Pilot environment walkthrough went well. Clinic IT wants SSO via Azure AD (we support SAML). No pricing objection raised; Naomi asked for a pilot success report template to present to their board.`
      }
    ]
  },
  {
    company: 'Finovate Core',
    industry: 'FinTech & Core Banking',
    contactName: 'Marcus Vance',
    contactRole: 'VP Engineering & Infrastructure',
    title: 'Real-Time Transaction Intelligence Pipeline',
    plan: 'Enterprise',
    value: 145000,
    stage: 'Proposal',
    summary:
      'High-value FinTech deal to modernize transaction ledger monitoring across 8 regional banking networks. Sub-10ms latency and strict PCI-DSS audit trails are critical non-negotiables.',
    nextMeetingAt: '2026-10-04T13:30:00.000Z',
    interactions: [
      {
        date: '2026-09-07',
        type: 'Discovery',
        participants: ['Marcus Vance (VP Engineering)', 'Elena Thorne (Principal Architect)'],
        notes: `Discovery with Finovate Core. Marcus outlined their pain with legacy batch reconciliation: transaction discrepancies take up to 24 hours to flag. They require real-time webhook ingestion and sub-10ms event processing. Evaluating Enterprise tier with custom dedicated compute. Budget estimated at $130k-$160k. Competitor Confluent was evaluated but discarded due to managed ops complexity.`
      },
      {
        date: '2026-09-14',
        type: 'Technical',
        participants: ['Elena Thorne (Principal Architect)', 'Finovate SecOps Team'],
        notes: `Architecture review. Tested synthetic 50,000 evt/sec throughput. Benchmarks satisfied Elena: average processing latency clocked at 6.8ms. Crucial requirement: audit logs must be immutable and exportable to AWS S3 Object Lock. Raised PCI-DSS v4.0 requirement; confirmed our encryption at rest satisfies requirements.`
      },
      {
        date: '2026-09-21',
        type: 'Commercial',
        participants: ['Marcus Vance', 'Rachel Green (Head of Procurement)'],
        notes: `Proposal presentation at $145,000/yr on a 2-year commitment. Rachel requested quarterly payment milestones tied to integration milestones rather than upfront annual payment. Marcus supported our pricing but noted Finance wants an SLA guarantee of 99.99% uptime with financial penalties for breach.`
      }
    ]
  },
  {
    company: 'CyberShield Defense',
    industry: 'Cybersecurity & SecOps',
    contactName: 'Dr. Leanne Zhao',
    contactRole: 'Chief Information Security Officer',
    title: 'Threat Intelligence Automation Engine',
    plan: 'Enterprise',
    value: 84000,
    stage: 'Technical Evaluation',
    summary:
      'Enterprise security operations evaluation. Dr. Zhao seeks to automate tier-1 alert triage across 1,200 endpoints. Data sovereignty and air-gapped private VPC connectivity are the key technical gates.',
    nextMeetingAt: '2026-10-03T16:00:00.000Z',
    interactions: [
      {
        date: '2026-09-06',
        type: 'Discovery',
        participants: ['Dr. Leanne Zhao (CISO)', 'Tariq Al-Mansoor (SOC Lead)'],
        notes: `Initial triage meeting. CyberShield SOC analysts are overwhelmed with 4,000+ daily alerts across CrowdStrike and Splunk. Seeking intelligent alert correlation and automatic context enrichment. Dr. Zhao stressed that no telemetry data can leave their EU and US residency zones.`
      },
      {
        date: '2026-09-13',
        type: 'Security',
        participants: ['Dr. Leanne Zhao (CISO)', 'Security Architecture Board'],
        notes: `Security review focused on data privacy. Reviewed AWS PrivateLink integration so traffic never traverses the public internet. Board expressed satisfaction with zero-retention logging options for PII payloads. SOC 2 Type II and ISO 27001 certificates delivered.`
      },
      {
        date: '2026-09-20',
        type: 'Technical',
        participants: ['Tariq Al-Mansoor (SOC Lead)', 'Automation Engineers'],
        notes: `Hands-on sandbox evaluation. Connected simulated Splunk alert feed. SOC team confirmed 62% reduction in false-positive escalations during tests. Tariq requested documentation for custom Python SDK hooks. Target rollout date: late November.`
      }
    ]
  },
  {
    company: 'AeroLogix Global',
    industry: 'Aerospace & Supply Chain',
    contactName: 'Carlos Mendez',
    contactRole: 'VP Supply Chain Transformation',
    title: 'Global Avionics Asset Intelligence',
    plan: 'Enterprise',
    value: 210000,
    stage: 'Negotiation',
    summary:
      'Largest pipeline opportunity ($210k ARR). Evaluated to optimize replacement part logistics across 32 international MRO maintenance hubs. Strong technical fit, but procurement is aggressively pushing for concessions.',
    nextMeetingAt: '2026-09-29T18:00:00.000Z',
    interactions: [
      {
        date: '2026-09-02',
        type: 'Discovery',
        participants: ['Carlos Mendez (VP)', 'Sven Lindqvist (Global Fleet Ops)'],
        notes: `Discovery with AeroLogix leadership. Aircraft on Ground (AOG) downtime costs them up to $150k/hour. Seeking predictive supply routing to position replacement turbofans and hydraulic actuators before scheduled maintenance. Current tool is a custom legacy SAP build.`
      },
      {
        date: '2026-09-10',
        type: 'Technical',
        participants: ['Sven Lindqvist', 'SAP Integration Team'],
        notes: `Technical architecture workshop. Validated SAP S/4HANA bidirectional sync through REST APIs. SAP team raised concerns about batch sync intervals causing stale inventory counts. We demonstrated real-time CDC (change data capture) support, which resolved their hesitation.`
      },
      {
        date: '2026-09-18',
        type: 'Commercial',
        participants: ['Carlos Mendez', 'Victoria Sterling (Global Procurement VP)'],
        notes: `Intense commercial session. Victoria stated that competitor Celonis submitted a competing proposal with 25% lower licensing fees. Carlos reaffirmed that our solution offers superior real-time alerts. Victoria insisted on a revised offer of $190k or inclusion of 24/7 dedicated support tiers.`
      },
      {
        date: '2026-09-25',
        type: 'Follow-up',
        participants: ['Carlos Mendez (VP)'],
        notes: `Private 1-on-1 with Carlos. Carlos gave guidance: if we can hold at $200k and include our Gold SLA package with dedicated engineering onboarding, he can push it through the executive committee before Q3 fiscal close. Preparing final counter-proposal.`
      }
    ]
  }
];

