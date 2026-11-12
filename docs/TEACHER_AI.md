# TMS AI Teaching Assistant

## Current implementation boundary

The first release adds an authenticated teacher-only assistant at `/teacher/ai` and `POST /api/teacher-ai`. It provides specialist prompt profiles for the six Teacher Desk document types and five actions: draft, field suggestion, review, improve, and innovation ideas.

The endpoint:
- Requires a valid Neon Auth session, exactly one teacher membership, and exactly one active teacher record linked to that user, tenant, and school.
- Uses the server-side Vercel AI Gateway endpoint; credentials are never sent to the browser.
- Requires `TMS_AI_MODEL` and either the deployment-provided `VERCEL_OIDC_TOKEN` or a server-side `AI_GATEWAY_API_KEY`; without them, the feature returns a clear disabled/configuration response.
- Limits request size and generated output, times out provider calls, and records action/type/model/character counts in the school audit log.
- Does not persist prompts or generated content in TMS tables.
- Treats generated content as a draft. The teacher must review and copy/adapt it; there is no automatic form overwrite or submission.
- Advises users not to send identifiable student data.

## Vercel environment configuration

Configure the following as Sensitive server-side Production variables (and separate Preview values when testing):
- `TMS_AI_MODEL`: a currently supported model identifier from the AI Gateway catalog, in `provider/model` format. Verify availability and cost before selecting it.
- Authentication: Vercel deployments use the automatically injected `VERCEL_OIDC_TOKEN`; non-Vercel runtimes may use `AI_GATEWAY_API_KEY` as a Sensitive server-only variable. Do not create or expose a public key.

Never use a `NEXT_PUBLIC_` prefix. Keep the feature unavailable until the organization has approved provider, model, data processing terms, budget, and usage limits. Do not enable broad teacher access before an administrator has configured and tested the provider.

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
