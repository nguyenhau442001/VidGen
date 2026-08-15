# TikTok Production Review Submission Draft

Replace bracketed deployment details before submitting. Keep the product name identical to the TikTok Developer Portal app name.

## App description

**VidGen Publisher** is a creator-facing publishing workspace for independent creators, educators, and creative teams producing original short-form videos. Creators can import a completed video from their device or receive a secure draft handoff from the VidGen rendering workflow. They connect their own TikTok account, preview the video, edit the proposed caption and hashtags, choose an account-supported privacy level and interactions, disclose commercial or AI-generated content when applicable, explicitly confirm the final post, and then publish. The workspace displays TikTok's processing status after submission.

VidGen Publisher is designed for use by multiple creators. It is not limited to accounts owned or managed by the developer, and it does not copy arbitrary content from other platforms.

## `video.publish` justification

VidGen Publisher requests `video.publish` so creators can send their reviewed original video directly to the TikTok account they explicitly connect. Direct Post is the final creator-controlled step in a production workflow: the app retrieves current creator information, displays the connected nickname, validates account-specific duration and settings, leaves all interaction controls off by default, requires a manual privacy choice, keeps proposed copy editable, requires accurate disclosure selections, and does not initialize transfer until the creator confirms and presses Publish. The app polls TikTok's status endpoint so the creator can see whether the post is processing, complete, or failed.

## Reviewer instructions

1. Open `[https://YOUR_DOMAIN/]` and review the product purpose, intended creator audience, workflow, and feature descriptions.
2. Open **How it works**, then **Publisher**.
3. Select a test video (MP4, MOV, or WebM), or use the supplied VidGen review draft.
4. Press **Connect TikTok** and authorize the requested `user.info.basic` and `video.publish` scopes using the provided Sandbox test creator.
5. Verify the connected TikTok nickname and username are visible.
6. Verify the privacy dropdown has no default and contains only the values returned for that creator.
7. Verify Comment, Duet, and Stitch begin unchecked; settings unsupported by the account are disabled.
8. Preview the video and edit the caption/hashtags.
9. Select a privacy level and test commercial-content disclosure behavior.
10. Check the explicit confirmation containing the applicable TikTok policy declaration.
11. Press **Confirm and publish to TikTok**.
12. Observe processing status until TikTok reports completion or a real failure.
13. Use **Disconnect** to revoke the connection.

Reviewer test credentials/access: `[PROVIDE THROUGH TIKTOK'S SECURE REVIEW FIELD—DO NOT COMMIT HERE]`

## Demo video checklist

Record one continuous, readable desktop or mobile-browser flow:

- [ ] Homepage: product name, creator-facing audience, purpose, workflow, main features, Publisher CTA.
- [ ] Footer: direct Privacy and Terms access.
- [ ] How it works page.
- [ ] Publisher before connection: no account data and no preselected privacy.
- [ ] Connect TikTok.
- [ ] TikTok authorization/consent showing requested scopes.
- [ ] Return to Publisher and show the connected creator identity.
- [ ] Select/import an original video.
- [ ] Play the preview.
- [ ] Edit the caption and hashtags.
- [ ] Open the privacy list and choose an available value.
- [ ] Show Comment/Duet/Stitch unchecked and an unsupported option disabled, if available on the test account.
- [ ] Show commercial-content controls and their validation.
- [ ] Check explicit confirmation.
- [ ] Press Publish once.
- [ ] Show real TikTok processing status and final result.
- [ ] Show Disconnect.

Do not use demo-mode sample data in the production-review recording. Do not edit the recording to hide errors or skip consent.

## VidGen handoff narrative

```text
VidGen render
  → secure draft handoff (video path or verified HTTPS URL, title, proposed caption,
    hashtags, metadata)
  → creator opens Publisher
  → creator previews and edits
  → creator connects TikTok and selects current account-supported settings
  → creator confirms
  → creator presses Publish
  → Publisher displays TikTok status
```

This handoff never triggers publishing. The `POST /api/vidgen/handoff` endpoint only creates a review draft and returns a Publisher URL. It requires the server-side `VIDGEN_HANDOFF_SECRET` header and accepts exactly one of `video_path` or `video_url`.

Example request from a trusted VidGen server process:

```bash
curl -X POST "$APP_URL/api/vidgen/handoff" \
  -H "Content-Type: application/json" \
  -H "X-VidGen-Handoff-Secret: $VIDGEN_HANDOFF_SECRET" \
  -d '{
    "video_path": "remotion/out/example.mp4",
    "title": "Why the route looks longer",
    "caption": "The system is optimizing time, not distance.",
    "hashtags": ["systemdesign", "techvietnam"],
    "metadata": {"source": "vidgen", "content_id": "example"}
  }'
```
