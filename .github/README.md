# Automated Figma Sync

When a designer publishes the Stacks Icons Figma library, a webhook triggers a GitHub Actions workflow that syncs asset hashes into `config.yaml` and opens a PR for review.

## Flow

```
Designer hits "Publish" in Figma
  → Figma fires LIBRARY_PUBLISH webhook
    → Netlify function (netlify/functions/figma-webhook.mts) validates and forwards it
      → GitHub Actions workflow (sync-figma.yml) runs npm run sync:figma
        → If config.yaml changed, a PR is opened against beta
```

## One-time setup

### 1. Create a GitHub App (preferred over a PAT)

A GitHub App is owned by the organisation and not tied to any individual account. If the person who set this up leaves, the automation keeps working.

1. Go to **GitHub org Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set:
   - Name: `Stacks Icons Sync` (or similar)
   - Homepage URL: the Netlify site URL
   - Uncheck **Webhooks active** (we don't need GitHub to receive webhooks)
   - Repository permissions: **Contents → Read & write**, **Pull requests → Read & write**
   - Where can this app be installed: **Only on this account**
3. Create the app and note the **App ID**
4. Under **Private keys**, generate and download a private key (`.pem` file)
5. Install the app on the `Stacks-Icons` repository via **Install App**
6. Note the **Installation ID** from the URL after installing:
   `https://github.com/organizations/StackExchange/settings/installations/{INSTALLATION_ID}`

### 2. Register the Figma webhook

Figma has no UI for webhooks — use the API once:

```bash
curl -X POST https://api.figma.com/v2/webhooks \
  -H "X-Figma-Token: YOUR_FIGMA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "LIBRARY_PUBLISH",
    "team_id": "YOUR_FIGMA_TEAM_ID",
    "endpoint": "https://YOUR_SITE.netlify.app/.netlify/functions/figma-webhook",
    "passcode": "YOUR_CHOSEN_PASSCODE",
    "description": "Stacks Icons sync"
  }'
```

To find your Figma team ID: open Figma in the browser, go to your team page — the ID is in the URL.

### 3. Add environment variables

**In Netlify** (Site settings → Environment variables):

| Variable | Value |
|----------|-------|
| `FIGMA_WEBHOOK_PASSCODE` | The passcode you chose above — validates that requests are genuinely from Figma |
| `GITHUB_APP_ID` | The App ID from step 1 |
| `GITHUB_APP_PRIVATE_KEY` | The full contents of the `.pem` file (including `-----BEGIN RSA PRIVATE KEY-----`) |
| `GITHUB_APP_INSTALLATION_ID` | The installation ID from step 1 |

**In GitHub** (repo Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `FIGMA_ACCESS_TOKEN` | A Figma personal access token — used by the sync script to fetch component data |

`FIGMA_FILE_KEY` (`Z5yoO4WH58QDHvmxwMWhr0`) is not a secret and is hardcoded in the workflow.

---

## How the PR looks

The workflow opens a PR against `beta` with the `asset` label. The description includes:

- Who published the library in Figma (`triggered_by` from the webhook payload)
- The publish note the designer wrote (if any)
- A table of every changed component with status and a preview image linked to its Figma node

| Status | Meaning |
|--------|---------|
| 🆕 New | Component exists in Figma but is not yet in `config.yaml` — add it manually if intentional |
| ✅ Updated | Hash changed — asset was modified in Figma |
| 🗑️ Removed | Entry is in `config.yaml` but the component is gone from Figma — remove it manually if intentional |
| ❌ Error | Hash could not be fetched — check Figma API access |

Preview images are sourced from Figma's export API and **expire ~48 hours** after the publish. Each image links directly to the component node in Figma so it can always be opened there.

---

## Manual trigger

The workflow can be run manually from **Actions → Sync Figma → Run workflow**. Attribution fields (`Published by`, `Publish note`) will be absent since there is no webhook payload.

## Updating the Figma webhook endpoint

If the Netlify site URL changes, update the webhook endpoint:

```bash
# List existing webhooks to get the webhook ID
curl https://api.figma.com/v2/webhooks \
  -H "X-Figma-Token: YOUR_FIGMA_ACCESS_TOKEN"

# Update the endpoint
curl -X PUT https://api.figma.com/v2/webhooks/{WEBHOOK_ID} \
  -H "X-Figma-Token: YOUR_FIGMA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "endpoint": "https://NEW_URL.netlify.app/.netlify/functions/figma-webhook" }'
```
