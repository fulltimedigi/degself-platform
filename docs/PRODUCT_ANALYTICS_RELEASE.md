# Product analytics release gate

The analytics code is safe to deploy without PostHog configuration: capture is a no-op until both public PostHog environment variables are configured in Vercel.

Activation happens only after the pull request passes CI and the Vercel Preview build. After deployment, verify event ingestion before creating saved funnel insights.
