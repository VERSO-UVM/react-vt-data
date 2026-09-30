import posthog from 'posthog-js';

const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

if (token) {
  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24', // auto page views + SPA route changes
  });
}
