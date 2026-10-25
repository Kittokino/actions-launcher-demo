/* Demo data: telecom action catalog, customer/case records, chat script, staged AI suggestions. */

const CATEGORIES = {
  billing: { id: "billing", label: "Billing", color: "#3ba755", tint: "#e7f4ea" },
  plans:   { id: "plans",   label: "Plans",   color: "#0176d3", tint: "#e4f0fb" },
  devices: { id: "devices", label: "Devices", color: "#9050e9", tint: "#f0e9fc" },
  network: { id: "network", label: "Network", color: "#dd7a01", tint: "#fbeedb" },
};

/* Inline SVG icons (24x24, fill: currentColor) */
const ICONS = {
  billing: '<svg viewBox="0 0 24 24"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z"/></svg>',
  plans:   '<svg viewBox="0 0 24 24"><path d="m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>',
  devices: '<svg viewBox="0 0 24 24"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>',
  network: '<svg viewBox="0 0 24 24"><path d="M2 22h20V2L2 22z"/></svg>',
  search:  '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>',
  pin:     '<svg viewBox="0 0 24 24"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>',
  close:   '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2l1.9 5.6 5.6 1.9-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7.5 11 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6zM5 15l.75 2.25L8 18l-2.25.75L5 21l-.75-2.25L2 18l2.25-.75L5 15z"/></svg>',
  clock:   '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5.25 3.15 1-1.65-4.25-2.5V7z"/></svg>',
  flow:    '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
  phone:   '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  mail:    '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  location:'<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
  person:  '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  einstein:'<svg viewBox="0 0 24 24"><path d="M12 2a1 1 0 0 1 1 1v1h3a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1V7a3 3 0 0 1 3-3h3V3a1 1 0 0 1 1-1z"/><circle cx="9.5" cy="12.5" r="1.4" fill="#032d60"/><circle cx="14.5" cy="12.5" r="1.4" fill="#032d60"/></svg>',
  thumbUp: '<svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
  thumbDown:'<svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>',
  arrowDown:'<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
  plus:    '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  briefcase:'<svg viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg>',
  chevronRight:'<svg viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
  book:    '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM8 12h8v1.6H8V12zm0 4h8v1.6H8V16z"/></svg>',
  sort:    '<svg viewBox="0 0 24 24"><path d="M8 5l4 4H9v6H7V9H4l4-4zm8 14l-4-4h3V9h2v6h3l-4 4z"/></svg>',
};

/* Action catalog: ~28 telecom workflows. */
const ACTIONS = [
  // ---- Billing ----
  { id: "dispute-charge", name: "Dispute a Charge", category: "billing",
    description: "Investigate and dispute a charge on the customer's bill.",
    synonyms: ["billing dispute", "wrong charge", "overcharge", "incorrect bill", "money back", "charged twice", "unrecognized charge"] },
  { id: "process-refund", name: "Process Refund", category: "billing",
    description: "Issue a refund for an incorrect or duplicate payment.",
    synonyms: ["money back", "reimburse", "payment return", "duplicate payment"] },
  { id: "payment-arrangement", name: "Set Up Payment Arrangement", category: "billing",
    description: "Create an installment plan for an outstanding balance.",
    synonyms: ["payment plan", "installments", "cannot pay", "pay later", "overdue balance"] },
  { id: "explain-bill", name: "Explain Bill", category: "billing",
    description: "Walk through the customer's latest bill line by line.",
    synonyms: ["bill breakdown", "high bill", "bill summary", "charges explained", "why is my bill high"] },
  { id: "apply-credit", name: "Apply Account Credit", category: "billing",
    description: "Add a goodwill or promotional credit to the account.",
    synonyms: ["goodwill", "compensation", "discount", "courtesy credit"] },
  { id: "update-payment-method", name: "Update Payment Method", category: "billing",
    description: "Change the card or bank account used for payments.",
    synonyms: ["new card", "autopay", "bank details", "billing info", "direct debit"] },
  { id: "paperless-billing", name: "Enable Paperless Billing", category: "billing",
    description: "Switch bill delivery from mail to email.",
    synonyms: ["e-bill", "email bill", "stop paper bills"] },
  { id: "payment-extension", name: "Request Payment Extension", category: "billing",
    description: "Extend the due date on the current bill.",
    synonyms: ["more time to pay", "due date change", "late payment"] },

  // ---- Plans ----
  { id: "change-plan", name: "Change Plan", category: "plans",
    description: "Move the customer to a different rate plan.",
    synonyms: ["upgrade plan", "downgrade", "switch plan", "new plan", "rate change"] },
  { id: "add-roaming-pack", name: "Add Roaming Pack", category: "plans",
    description: "Attach an international roaming package to the line.",
    synonyms: ["travel pack", "international", "abroad", "roaming charges", "overseas"] },
  { id: "add-data-boost", name: "Add Data Boost", category: "plans",
    description: "Add a one-time data top-up to the current cycle.",
    synonyms: ["extra data", "data top up", "out of data", "more gigabytes"] },
  { id: "add-family-line", name: "Add Family Line", category: "plans",
    description: "Add a new line to a family or shared plan.",
    synonyms: ["extra line", "add a line", "shared plan", "family plan"] },
  { id: "loyalty-discount", name: "Apply Loyalty Discount", category: "plans",
    description: "Apply retention or loyalty pricing to the plan.",
    synonyms: ["retention offer", "loyalty offer", "cheaper plan", "special deal"] },
  { id: "cancel-service", name: "Cancel Service", category: "plans",
    description: "Start the cancellation and retention flow.",
    synonyms: ["close account", "terminate", "leave", "quit service", "disconnect"] },
  { id: "suspend-service", name: "Suspend Service", category: "plans",
    description: "Temporarily pause the line for travel, loss, or non-payment.",
    synonyms: ["pause service", "vacation hold", "freeze line", "temporary stop"] },
  { id: "renew-contract", name: "Renew Contract", category: "plans",
    description: "Renew or extend the customer's service agreement.",
    synonyms: ["contract extension", "re-sign", "renewal"] },

  // ---- Devices ----
  { id: "activate-sim", name: "Activate SIM", category: "devices",
    description: "Activate a new physical SIM or eSIM on the line.",
    synonyms: ["new sim", "esim", "sim card setup", "activate phone"] },
  { id: "lost-stolen", name: "Report Lost or Stolen Device", category: "devices",
    description: "Block the device and SIM, then start a replacement.",
    synonyms: ["lost phone", "stolen phone", "block sim", "imei block"] },
  { id: "upgrade-eligibility", name: "Device Upgrade Eligibility", category: "devices",
    description: "Check when the customer can upgrade their device.",
    synonyms: ["new phone", "upgrade check", "eligible upgrade", "due for upgrade"] },
  { id: "device-trade-in", name: "Start Device Trade-In", category: "devices",
    description: "Begin a trade-in valuation for the current device.",
    synonyms: ["trade in", "sell phone", "exchange device", "old phone"] },
  { id: "troubleshoot-device", name: "Troubleshoot Device", category: "devices",
    description: "Run guided diagnostics on the customer's device.",
    synonyms: ["phone not working", "device issue", "wont turn on", "broken phone", "battery drain"] },
  { id: "warranty-claim", name: "File Warranty Claim", category: "devices",
    description: "Start a warranty or insurance claim for a device.",
    synonyms: ["insurance claim", "damaged phone", "cracked screen", "replacement"] },
  { id: "unlock-device", name: "Unlock Device", category: "devices",
    description: "Request a carrier unlock for the device.",
    synonyms: ["carrier unlock", "use other sim", "network unlock"] },

  // ---- Network ----
  { id: "report-outage", name: "Report Network Outage", category: "network",
    description: "Log a service outage in the customer's area.",
    synonyms: ["no signal", "service down", "outage", "no coverage", "network down"] },
  { id: "coverage-check", name: "Run Coverage Check", category: "network",
    description: "Check network coverage at a specific address.",
    synonyms: ["signal map", "coverage map", "reception check"] },
  { id: "reset-network", name: "Reset Network Settings", category: "network",
    description: "Push a network settings refresh to the device.",
    synonyms: ["provisioning", "refresh connection", "re-provision", "apn settings"] },
  { id: "wifi-calling", name: "Enable WiFi Calling", category: "network",
    description: "Turn on WiFi calling for the line.",
    synonyms: ["wifi calls", "call over wifi", "bad indoor signal"] },
  { id: "escalate-network", name: "Escalate to Network Team", category: "network",
    description: "Create an escalation ticket for network engineering.",
    synonyms: ["escalation", "tier 2", "technical team", "persistent issue"] },
];

const DEFAULT_PINS = ["explain-bill", "change-plan", "activate-sim", "report-outage"];

const CUSTOMER = {
  name: "Sari Tsering",
  account: "ACC-48291",
  plan: "Unlimited Plus 5G",
  status: "Active",
  since: "March 2020",
  balance: "$184.50",
  balanceNote: "May bill · due Jul 15",
  phone: "+1 (987) 654-3210",
  email: "sari.tsering@email.com",
  devices: "iPhone 14 Pro · Galaxy Watch 6",
  street: "1180 Mission St",
  city: "Austin",
  region: "Texas",
  zip: "78704",
  preferredContact: "Chat · 9am–6pm CT",
  lastPayment: "$95.20 · May 30",
  paymentMethod: "Visa ••4242",
  billingCycle: "15th of each month",
  paperless: "On",
  simType: "eSIM",
  contract: "Month-to-month",
};

/* Rich profile card (left rail of the customer tab). Telecom-adapted from the mock. */
const CUSTOMER_PROFILE = {
  fullName: "Dr. Sari Tsering",
  nickname: "Sarah",
  pronouns: "She, her, hers",
  badges: [
    { label: "Pro", kind: "pro" },
    { label: "Birthday today", kind: "muted" },
  ],
  phone: "+1 (987) 654-3210",
  email: "sari.tsering@email.com",
  location: "Mission St Store, Austin, TX",
  tags: [
    { label: "High-Value Account" },
    { label: "Customer since 6 years" },
    { label: "Age 50+" },
    { label: "Gold Loyalty", link: true },
    { label: "English only" },
  ],
  retention: {
    score: 62.5,
    risk: "Medium",
    note: "This customer is active but data usage has dipped over the last two billing cycles.",
  },
  insights: [
    {
      text: "Sari has contacted support twice in the last 3 months about unexpected roaming charges and a higher-than-usual bill. Her data usage has fallen since May, and she recently compared competitor plans on the self-service portal.",
      recommendations: [
        { prefix: "Apply a", linkText: "Loyalty Discount", actionId: "loyalty-discount" },
        { prefix: "Send a", linkText: "Customer Satisfaction Survey", actionId: null },
      ],
      generated: "Fri, 01 Sep, 2:30 PM",
    },
    {
      text: "Sari travels to Spain frequently and has raised repeated concerns about international roaming costs. She upgraded two family lines last year and pays reliably — a strong candidate for a proactive retention offer.",
      recommendations: [
        { prefix: "Add a", linkText: "Roaming Pack", actionId: "add-roaming-pack" },
        { prefix: "Review options via", linkText: "Change Plan", actionId: "change-plan" },
      ],
      generated: "Today, 2:38 PM",
    },
  ],
};

const CASE_RECORD = {
  number: "00042317",
  subject: "Unexpected roaming charges on May bill",
  status: "New",
  priority: "High",
  origin: "Chat",
  opened: "Today, 2:14 PM",
  contact: "Sari Tsering",
  description: "Customer reports ~$85 of unrecognized international roaming charges after a trip to Spain (May 4–18). Wants the charges reviewed and options to avoid this on future trips.",
};

/* Suggested knowledge articles (telecom), most relevant to the current roaming case first. */
const KNOWLEDGE_ARTICLES = [
  { id: "kb-roaming", number: "000004417", title: "How to avoid international roaming charges", published: "12 Aug 2026, 09:14", iso: "2026-08-12T09:14", snippet: "Add a roaming pack before you travel and switch off data roaming to prevent surprise charges." },
  { id: "kb-bill",    number: "000004310", title: "Understanding the charges on your monthly bill", published: "28 Jul 2026, 11:05", iso: "2026-07-28T11:05", snippet: "A breakdown of plan charges, add-ons, taxes and one-time fees on your Infiwave bill." },
  { id: "kb-plan",    number: "000004256", title: "Changing or upgrading your plan", published: "10 Jul 2026, 14:22", iso: "2026-07-10T14:22", snippet: "Compare plans and switch anytime — changes apply from your next billing cycle." },
];

/* Mock closed-case history for the customer (shown in the Closed Cases subtab). */
const CLOSED_CASES = [
  { number: "00039902", subject: "Duplicate autopay charge in March", reason: "Resolved",        closed: "Mar 18, 2026" },
  { number: "00038154", subject: "eSIM activation failing on new device", reason: "Resolved",     closed: "Jan 27, 2026" },
  { number: "00036007", subject: "Dropped calls in downtown Austin",       reason: "No Fault Found", closed: "Nov 09, 2025" },
  { number: "00034221", subject: "Downgrade from Unlimited Pro plan",      reason: "Completed",     closed: "Aug 30, 2025" },
  { number: "00032740", subject: "Late-fee waiver request",                reason: "Resolved",       closed: "Jun 12, 2025" },
];

/* Scripted live chat. Messages reveal one at a time. */
const CHAT_SCRIPT = [
  { from: "customer", text: "Hi, I just got my May bill and it's way higher than usual??" },
  { from: "agent",    text: "Hi Sari! Sorry to hear that — let me pull up your bill right away." },
  { from: "customer", text: "It's like $184 when it's normally $95. There's a bunch of charges I don't recognize." },
  { from: "customer", text: "A lot of them say 'intl roaming'. I was in Spain for two weeks but I thought my plan covered that!" },
  { from: "agent",    text: "Thanks — I can see roaming charges from May 4–18. Your current plan doesn't include international roaming, but let's see what we can do." },
  { from: "customer", text: "That's really frustrating. Honestly I travel to Spain every couple of months for work." },
  { from: "customer", text: "Is there something that would stop this from happening on every trip?" },
  { from: "agent",    text: "Absolutely — we have roaming packs that cover EU travel, and I can also look at plans with roaming included." },
  { from: "customer", text: "That would be great. Oh, and while I have you — my phone is three years old and the battery is dying." },
  { from: "customer", text: "Am I due for an upgrade? Maybe it makes sense to sort out a new phone and a new plan together." },
  { from: "agent",    text: "Great timing — let me check your upgrade eligibility and trade-in options right now." },
];

/* Pre-authored Einstein output keyed to conversation progress (messages revealed).
   Each stage lists the intents Einstein "extracts"; each intent maps to matching actions.
   invokeAutofill uses the latest stage whose minMessages has been reached. */
const AI_STAGES = [
  {
    minMessages: 4,
    intents: [
      { id: "dispute-roaming",  label: "Dispute Roaming Charges", actionIds: ["dispute-charge", "apply-credit"] },
      { id: "understand-bill",  label: "Understand High Bill",    actionIds: ["explain-bill", "update-payment-method"] },
    ],
  },
  {
    minMessages: 7,
    intents: [
      { id: "avoid-roaming",    label: "Avoid Future Roaming Cost", actionIds: ["add-roaming-pack", "change-plan"] },
      { id: "dispute-roaming",  label: "Dispute Roaming Charges",   actionIds: ["dispute-charge", "apply-credit"] },
    ],
  },
  {
    minMessages: 10,
    intents: [
      { id: "upgrade-device",   label: "Upgrade Device", actionIds: ["upgrade-eligibility", "device-trade-in"] },
      { id: "review-plan",      label: "Review Plan",    actionIds: ["change-plan", "loyalty-discount"] },
    ],
  },
];
