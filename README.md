# Actions Launcher

An AI-assisted way for a customer-service rep to find and launch the right workflow (action) while a conversation is ongoing with the customer.

🔗 **Live demo:** https://kittokino.github.io/actions-launcher-demo/

## Why this exploration

On a live call or chat, a rep has to find *the right thing to do* across dozens of workflows they don't have memorized - and menu-hunting mid-conversation is slow. This prototype explores a fix: a fast, typo- and synonym-tolerant **search**, rep-managed **pinned actions**, and an **AI that listens to the conversation** and suggests the matching actions on demand. It's a front-end concept (styled as a Salesforce-style console for a fictional telecom company) built to pressure-test the idea and the UX.

## What to play with?

- **Search** the *Search actions* field (or `Ctrl/Cmd + K`): try `money back` or the typo `refnd` — note how results explain *why* they matched.
- **Pinned actions:** click one to launch it; use the `▾` overflow → **Edit pinned actions** to curate them.
- **Einstein:** in the live-chat panel (right), click **Next message** a few times, then **Autofill with Einstein** — it extracts the customer's intents and swaps in matching actions. **Show pinned actions** restores your pins.
- **The record:** open **View closed cases**, search the **Knowledge** card, and hit **Regenerate insights** on the profile.

## Good to know

- Plain HTML/CSS/JS + [SLDS](https://www.lightningdesignsystem.com/), no backend — everything (search, AI, chat) is mocked client-side.
- All data is fictional. Independent concept prototype — **not affiliated with Salesforce**; SLDS/"Einstein" marks belong to Salesforce, Inc.
- Best viewed on a **desktop** screen, preferably on a **1980x1080 resolution**.

---

Built by [@kittokino](https://github.com/kittokino) · All rights reserved (public for viewing/demo only).

Disclaimer:
This project is an independent, non-commercial UX prototype and concept exploration. It is not affiliated with, endorsed by, or sponsored by Salesforce, Inc. "Salesforce" and "Salesforce Service Console" are registered trademarks of Salesforce, Inc. All UI designs are simulated for demonstration purposes only.
