# TikTok Production Review Checklist

This checklist is for the TikTok Developer Portal. Complete it against the deployed **VidGen Publisher** site, not localhost. TikTok settings and limits can change; re-check the linked official documentation before submission.

## 1. Deploy and verify the public product

- [ ] Deploy the FastAPI app with HTTPS and a stable production domain.
- [ ] Confirm these pages load without authentication:
  - Website URL: `https://YOUR_DOMAIN/`
  - Product workflow: `https://YOUR_DOMAIN/features`
  - Publisher: `https://YOUR_DOMAIN/publisher`
  - Privacy Policy URL: `https://YOUR_DOMAIN/privacy`
  - Terms of Service URL: `https://YOUR_DOMAIN/terms`
- [ ] Confirm the displayed product name exactly matches the Developer Portal app name: **VidGen Publisher**. If the portal uses another approved name, update the site and submission copy before review.
- [ ] Confirm footer Privacy and Terms links work on desktop and mobile.
- [ ] Confirm the app is presented as a creator-facing tool for multiple creators, never as an internal or single-account uploader.
- [ ] Remove `TIKTOK_MODE=demo` from the production deployment; use `TIKTOK_MODE=live`.

## 2. Configure Login Kit / OAuth

- [ ] Add Login Kit to the app if the portal requires it for web OAuth.
- [ ] Add the exact Redirect URI: `https://YOUR_DOMAIN/auth/tiktok/callback`.
- [ ] Set `TIKTOK_REDIRECT_URI` to the exact same value, including scheme, host, path, and trailing-slash choice.
- [ ] Request `user.info.basic` and `video.publish`; confirm the consent screen shows the intended scopes.
- [ ] Keep `TIKTOK_CLIENT_SECRET`, `SESSION_SECRET`, and `TOKEN_ENCRYPTION_KEY` only in the server environment.
- [ ] Test connect, callback state validation, token refresh, disconnect, and token revocation.

## 3. Add Content Posting API

- [ ] Add **Content Posting API** under Products.
- [ ] Apply for the **video.publish** scope and Direct Post access.
- [ ] Explain why Direct Post is necessary using `docs/TIKTOK_REVIEW_SUBMISSION.md`.
- [ ] Confirm the integration calls `creator_info/query` when the Publisher loads and again immediately before posting.
- [ ] Confirm no upload to TikTok begins before the creator checks confirmation and presses Publish.

## 4. URL Properties / domain verification

- [ ] Add and verify the production domain or the narrow media URL prefix in the app's URL Properties.
- [ ] Use a verification file served from the exact required path, or the portal's supported DNS verification method.
- [ ] For `PULL_FROM_URL`, use only HTTPS URLs on that verified property, without redirects, and keep them available while TikTok downloads.
- [ ] If URL ownership is not verified, demonstrate `FILE_UPLOAD` instead.

## 5. Sandbox testing

- [ ] Create/configure a Sandbox in the Developer Portal.
- [ ] Add authorized test creators; do not represent sandbox access as public production availability.
- [ ] Test `SELF_ONLY` behavior for an unaudited client.
- [ ] Test public and private creator accounts and every privacy option returned by `creator_info`.
- [ ] Test accounts where Comment, Duet, or Stitch is disabled.
- [ ] Test a video over `max_video_post_duration_sec` and confirm publishing is blocked.
- [ ] Test commercial disclosure with no subtype selected (blocked), branded content + `SELF_ONLY` (blocked), and valid selections.
- [ ] Test token expiry/refresh, creator posting-cap errors, failed processing, and disconnect.
- [ ] Confirm demo mode is visibly labeled and never returns fake production status.

## 6. Production submission

- [ ] Use the exact public Website, Privacy, Terms, and Redirect URLs above.
- [ ] Provide current screenshots of the complete public site and Publisher.
- [ ] Upload a continuous demo recording following `docs/TIKTOK_REVIEW_SUBMISSION.md`.
- [ ] Provide reviewer credentials or an access path if any part of the workflow is gated. The public pages themselves should not be gated.
- [ ] State expected creator volume honestly for TikTok's active-creator cap.
- [ ] Describe retention, encrypted server-side token storage, disconnect/revocation, and deletion handling accurately.
- [ ] Confirm uploaded videos have no VidGen promotional watermark, logo, link, or promotional overlay.
- [ ] Submit the app and Content Posting API audit/production review. Respond to reviewer feedback with a new recording when behavior changes.

## Official references

- [TikTok Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/)
- [Direct Post API](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [Query Creator Info](https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info)
- [Media Transfer Guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide)
- [Get Post Status](https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status)
- [OAuth user access token management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [TikTok Developer Guidelines](https://developers.tiktok.com/doc/our-guidelines-developer-guidelines/)
