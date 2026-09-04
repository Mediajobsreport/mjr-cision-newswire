# MJR Cision Newswire Importer

This GitHub-ready Node.js project retrieves authorized Cision/PR Newswire releases and creates categorized JSON feeds for Media Jobs Report. It preserves the supplied release text and multimedia; it does not rewrite stories.

## What it produces

The workflow updates these files every 15 minutes:

- `data/newswire/master.json`
- `data/newswire/advertising.json`
- `data/newswire/digital.json`
- `data/newswire/engineering.json`
- `data/newswire/entertainment.json`
- `data/newswire/management.json`
- `data/newswire/podcast.json`
- `data/newswire/radio.json`
- `data/newswire/television.json`
- `data/newswire/tradeshow.json`
- `data/newswire/review.json`

Only confident matches enter a named feed. Borderline media releases go to `review.json`; unrelated releases are discarded.

## Installation

Upload this project to a GitHub repository. No npm packages are required.

In GitHub, open **Settings → Secrets and variables → Actions** and create two repository secrets:

- `CISION_LOGIN` — the login supplied by Cision
- `CISION_PASSWORD` — the password supplied by Cision

Never put either value in a source file.

Open **Actions → Update Cision Newswire Feeds → Run workflow** to perform the first import. The manual run backfills 24 hours by default. You can enter a larger number of hours, up to 8,760 (one year), but begin with 24 while validating the feed.

## Important behavior

- Queries `USA|CAN` and English releases by default.
- Polls by modification time with a 10-minute overlap to avoid gaps.
- Follows Cision pagination in batches of 100.
- Fetches full bodies only for likely media-industry releases.
- Uses `release_id` for duplicate protection and corrected-story replacement.
- Requests deleted releases and removes withdrawn items from every feed.
- Refreshes the Cision code lists weekly.
- Retains 45 days of releases by default.
- Renews authentication if the token is near expiration or rejected.

## Optional configuration

The workflow environment variables can be changed without editing the importer:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CISION_GEOGRAPHY` | `USA|CAN` | Cision geography-code query |
| `CISION_LANGUAGE` | `en` | Release language |
| `CISION_RETENTION_DAYS` | `45` | Days retained in generated feeds |
| `CISION_OVERLAP_MINUTES` | `10` | Modification-window overlap |
| `CISION_BACKFILL_HOURS` | `24` | Initial/manual backfill period |

## Local testing

```bash
npm test
```

To run a live import locally, set `CISION_LOGIN` and `CISION_PASSWORD` in the shell environment and run `npm start`. Do not save credentials in `.env` unless that file remains private; `.env` is excluded from Git.

## Website connection

When GitHub Pages or a raw-file endpoint exposes the repository, MJR can read the category JSON files directly. Review `review.json` before publishing uncertain stories. The `body` property remains the HTML delivered by Cision, and the `multimedia` property contains Cision’s supplied image URLs and captions.
