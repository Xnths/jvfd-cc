<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the psychology clinic website. The integration covers client-side event tracking across all major user interactions, server-side tracking for critical registration events, user identification on login, and a reverse proxy setup to reduce ad-blocker interference.

**Infrastructure changes:**
- Installed `posthog-js` and `posthog-node` packages
- Created `instrumentation-client.ts` at the project root — initializes PostHog client-side using the Next.js 15.3+ pattern (no Provider needed)
- Created `src/lib/posthog-server.ts` — singleton PostHog Node.js client for server-side routes
- Updated `next.config.mjs` — added `/ingest` reverse proxy rewrites and `skipTrailingSlashRedirect: true`
- Added `NEXT_PUBLIC_POSTHOG_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`

**Event tracking added to 12 files:**

| Event | Description | File |
|---|---|---|
| `schedule_click` | User clicks WhatsApp CTA (hero_cta). Includes `source` and `time_to_click_ms`. | `src/components/Hero.tsx` |
| `schedule_click` | User clicks floating WhatsApp button. Source: floating_button. | `src/components/floating-cat-button.tsx` |
| `schedule_click` | User clicks WhatsApp contact card. Source: contact_card. | `src/components/Contact.tsx` |
| `schedule_click` | User clicks WhatsApp CTA in blog article footer. Source: blog_article_footer. | `src/components/BlogArticleFooter.tsx` |
| `qr_code_opened` | User opens the QR code dialog to scan for WhatsApp. Includes `source` and `time_to_click_ms`. | `src/components/ContactForm.tsx` |
| `newsletter_subscribed` | User successfully subscribes to the newsletter. | `src/components/NewsletterForm.tsx` |
| `user_logged_in` | User logs in. Also calls `posthog.identify()` with user ID, email, and name. | `src/components/LoginForm.tsx` |
| `user_registered` | User creates a new account (client-side). Includes `subscribeNewsletter`. | `src/components/RegisterForm.tsx` |
| `user_registered` | User creates a new account (server-side, reliable). Includes `name` and `subscribeNewsletter`. | `src/app/api/auth/register/route.ts` |
| `blog_searched` | User types a search query (≥3 chars, debounced 800ms). Includes `search_term`. | `src/components/BlogList.tsx` |
| `comment_submitted` | User successfully submits a blog comment. Includes `post_id`. | `src/components/CommentForm.tsx` |
| `instagram_follow_clicked` | User clicks the Instagram soft CTA link. Source: soft_cta. | `src/components/SoftCta.tsx` |
| `treatment_page_viewed` | User views a treatment detail page (top-of-funnel). Includes `treatment_title`. | `src/components/TreatmentPage.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/343740/dashboard/1363573
- **Schedule & QR Code CTAs** (daily trend): https://us.posthog.com/project/343740/insights/fmxcTLHn
- **Treatment Page → Schedule Conversion Funnel**: https://us.posthog.com/project/343740/insights/Y9bvBQ7g
- **Blog User Activation Funnel** (Register → Login → Comment): https://us.posthog.com/project/343740/insights/qSKPd9AJ
- **Newsletter & Blog User Growth (weekly)**: https://us.posthog.com/project/343740/insights/R0bwIKWD
- **Schedule Clicks by CTA Source** (breakdown): https://us.posthog.com/project/343740/insights/uKZ5q9am

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
