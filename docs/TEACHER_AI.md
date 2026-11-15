# TMS AI Teaching Assistant

## Current implementation boundary

The release adds an authenticated teacher-only assistant at `/teacher/ai` and `POST /api/teacher-ai`. It provides specialist profiles for the six Teacher Desk document types and five actions: draft, field suggestion, review, improve, and innovation ideas. The Teacher Desk editor also exposes an AI suggestion action on each field; suggestions are displayed separately and only applied after explicit teacher acceptance.

The endpoint:
- Requires a valid Neon Auth session, exactly one teacher membership, and exactly one active teacher record linked to that user, tenant, and school.
- Uses the server-side Vercel AI Gateway endpoint; credentials are never sent to the browser.
- Requires both `TMS_AI_ENABLED=true` and `TMS_AI_BUDGET_APPROVED=true`, a configured `TMS_AI_MODEL`, and either the deployment-provided `VERCEL_OIDC_TOKEN` or a server-side `AI_GATEWAY_API_KEY`; the feature remains disabled unless both approval gates are enabled.
- Limits request size and generated output, times out provider calls, and records action/type/model/character counts in the school audit log.
- Does not persist prompts or generated content in TMS tables.
- Treats generated content as a draft. The teacher must review and copy/adapt it; there is no automatic form overwrite or submission.
- Advises users not to send identifiable student data.
- Inline field assistance sends only a fixed allowlist of general academic context keys; student profile, attendance, evidence, and assessment-result fields are not included in that automatic context.

## Vercel environment configuration

Configure the following as Sensitive server-side Production variables (and separate Preview values when testing):
- `TMS_AI_ENABLED`: keep `false` until an authorized pilot is ready.
- `TMS_AI_BUDGET_APPROVED`: keep `false` until the organization explicitly approves the monthly spend ceiling; both flags must be `true` before any model call can occur.
- `TMS_AI_MODEL`: a currently supported model identifier from the AI Gateway catalog, in `provider/model` format. Verify availability and cost before selecting it.
- Authentication: Vercel deployments use the automatically injected `VERCEL_OIDC_TOKEN`; non-Vercel runtimes may use `AI_GATEWAY_API_KEY` as a Sensitive server-only variable. Do not create or expose a public key.

Never use a `NEXT_PUBLIC_` prefix. Keep both `TMS_AI_ENABLED=false` and `TMS_AI_BUDGET_APPROVED=false` until the organization has approved provider, model, data processing terms, budget, and usage limits. Do not enable broad teacher access before an administrator has configured and tested the provider.

## Agent roadmap

The current pipeline uses two distinct model calls: a document-specific specialist agent creates a draft, then an independent reviewer agent checks facts, completeness, privacy, and unsupported assumptions before returning a reviewed draft. The teacher remains the final approver. Further agents for curriculum/source retrieval, school policy, differentiation, assessment design, school-level analytics, voice input, provider failover, per-tenant quotas, and admin usage dashboards remain later phases.

## Commercial and privacy gates

Before commercial enablement:
1. Review the provider's data processing terms and applicable Indonesian personal-data requirements.
2. Confirm the chosen model is available, supported in the target region, and within approved unit costs.
3. Add per-user/per-tenant rate limits and budget ceilings at the gateway or application layer.
4. Test unauthorized, cross-tenant, multi-membership, timeout, provider failure, oversized input, and prompt-injection cases.
5. Perform teacher acceptance testing and review audit-log access/retention.
6. Publish a clear AI-use notice and prohibit identifiable student data unless a documented lawful basis and approved safeguards exist.

This implementation is a controlled foundation, not a declaration that AI is already active or that the full TMS is commercially ready.

## Free online knowledge access (13 November 2026)

The teacher assistant now includes a public-source directory and simple online search entry point:
- Indonesian curriculum portal: https://kurikulum.kemendikdasmen.go.id/
- Kemendikdasmen repository: https://repositori.kemendikdasmen.go.id/
- Rumah Pendidikan: https://rumah.pendidikan.go.id/ (portal publik; beberapa layanan meminta akun)
- Ruang GTK: https://guru.kemendikdasmen.go.id/ (beberapa fitur memerlukan belajar.id)
- Pusat Informasi Guru: https://pusatinformasi.guru.kemendikdasmen.go.id/
- Kemendikdasmen official portal: https://www.kemendikdasmen.go.id/
- UNESCO Education: https://www.unesco.org/en/education
- CAST UDL Guidelines: https://udlguidelines.cast.org/
- ERIC education research: https://eric.ed.gov/

Search is opened on DuckDuckGo with a `site:` restriction for the selected source. TMS does not proxy, scrape, summarize, or store online search results. Search is free to use without a TMS API key or subscription; the query is sent directly to the external search provider. Source-site content and download rights vary, so users must check the original publisher's terms and document version.

This online-source directory is intentionally a no-API, no-subscription baseline. It is not a live AI web-research agent and does not claim that every linked document is free or current. Future direct search integrations must be reviewed for provider terms, privacy, quotas, and cost before activation.

## Cost and consent policy

- Local knowledge retrieval: runs within TMS; no external model call or per-query AI provider fee.
- Online source directory and DuckDuckGo search: no TMS subscription or API credential required; external provider receives the search query. Users should not include personal student information.
- Generative AI: calls the external AI Gateway twice per request (specialist and reviewer). It remains disabled until the organization approves the provider/model, data-processing terms, and an explicit monthly budget ceiling. The user-facing interface must disclose this before activation.
- No paid search, AI, storage, or other third-party service may be silently enabled or billed to a teacher. Any future paid provider requires clear disclosure of provider, free allowance, expected charges, quotas, and user/administrator consent.
