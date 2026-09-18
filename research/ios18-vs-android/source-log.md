# Source Log — iOS 18 vs Android + iPhone Duo

## S001
- Title: iOS 18 makes iPhone more personal, capable, and intelligent than ever
- Organization/Author: Apple Newsroom
- URL: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- Publish date: 2024-06-10
- Access date: 2026-09-10
- Source type: 1
- Reliability: fact
- Claims supported: iOS 18 lets users place app icons/widgets in open spaces on Home Screen; dark & tinted icon effects; Control Center redesigned with a controls gallery, resizable controls, new groups, and third-party app controls; lock an app behind Face ID/Touch ID/passcode and hide apps into a locked App Library folder.
- Limitations: Announcement copy, not a spec sheet; describes intent at WWDC, some details evolved through betas.
- Notes: Primary official source for every iOS 18 feature claim in the video.

## S002
- Title: How to use the new Home Screen customization tools in iOS 18 — place app icons anywhere, color tints, Dark Mode icons
- Organization/Author: iMore
- URL: https://www.imore.com/ios/ios-18/ios-18-home-screen-customization
- Publish date: 2024
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Before iOS 18 the iPhone Home Screen forced a top-left cascading grid; iOS 18 allows gaps, empty rows/columns, icons above the dock; Dark/Light/Automatic and custom tint via Edit > Customize.
- Limitations: Tech-press how-to, not official; consistent with Apple Newsroom.
- Notes: Used to support "Apple previously controlled the Home Screen tightly."

## S003
- Title: iOS 18: Reorder, Resize, and Remove Buttons in Control Center
- Organization/Author: MacRumors
- URL: https://www.macrumors.com/how-to/ios-reorder-resize-buttons-control-center/
- Publish date: 2024
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: iOS 18 Control Center lets users add/remove, move, and resize controls via a drag handle; multiple customizable control screens.
- Limitations: Tech-press how-to.
- Notes: Corroborates S001 Control Center claims with hands-on detail.

## S004
- Title: Lock or hide an app on iPhone — Apple Support
- Organization/Author: Apple Support
- URL: https://support.apple.com/guide/iphone/lock-or-hide-or-an-app-iph00f208d05/ios
- Publish date: not dated (evergreen support doc)
- Access date: 2026-09-10
- Source type: 1
- Reliability: fact
- Claims supported: Touch-and-hold an app > Require Face ID (or Touch ID/passcode); Hide and Require Face ID moves app to a locked Hidden folder at the bottom of App Library; hidden apps are removed from Home Screen, search, and notifications; built-in apps can't be hidden.
- Limitations: Evergreen doc, not version-stamped; feature introduced in iOS 18.
- Notes: Official mechanics for the Lock/Hide segment.

## S005
- Title: What is the difference between iMessage, RCS, and SMS/MMS?
- Organization/Author: Apple Support
- URL: https://support.apple.com/en-us/120496
- Publish date: not dated (evergreen)
- Access date: 2026-09-10
- Source type: 1
- Reliability: fact
- Claims supported: iPhone supports RCS with carrier support; RCS messages between iPhone and Android carry read receipts, typing indicators, higher-res photos/videos, and improved group messaging; RCS messages still appear as green bubbles; RCS is not end-to-end encrypted the way iMessage is.
- Limitations: Apple frames RCS relative to iMessage; does not claim parity.
- Notes: Anchors the "closer to a common standard, not identical" framing.

## S006
- Title: Apple announces RCS support coming to iPhones via iOS 18 this fall
- Organization/Author: PhoneArena
- URL: https://www.phonearena.com/news/finally-apple-announces-rcs-support-coming-to-iphones-via-ios-18-this-fall_id159249
- Publish date: 2023-11-16
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Apple publicly confirmed (Nov 2023) RCS Universal Profile support would arrive on iPhone in 2024 via a software update; it shipped in iOS 18.
- Limitations: Tech press; the underlying confirmation was an Apple statement to press.
- Notes: Establishes RCS on iPhone as an Apple decision, not a rumor.

## S007
- Title: Themed icons — Android 12 / Android 13 rollout
- Organization/Author: Android Police
- URL: https://www.androidpolice.com/android-13-themed-icons-how-to-activate/
- Publish date: 2022
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Google introduced themed (wallpaper-tinted) icons with Android 12 (2021), limited to Google apps; Android 13 (2022) opened it to any app that ships a monochrome icon. Themed icons follow the system light/dark theme.
- Limitations: Themed icons on stock Android/Pixel; coverage still depends on each app shipping a monochrome asset. Third-party skins (One UI, MIUI) added their own timelines.
- Notes: Supports "Android had wallpaper-matched / theme-following icons years earlier" — with the monochrome-asset caveat.

## S008
- Title: Nova Launcher — subgrid positioning; long-standing Android Home Screen freedom
- Organization/Author: Android Police / Google Play listing
- URL: https://www.androidpolice.com/ways-to-make-your-android-homescreen-look-amazing/
- Publish date: 2024
- Access date: 2026-09-10
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Android launchers (stock and third-party like Nova) have long allowed empty grid cells, widgets placed freely, gaps between icons, resizable widgets, and subgrid snapping — years before iOS 18.
- Limitations: Exact freedom varies by launcher; stock Pixel launcher is more limited than Nova; this is a general Android-platform capability, not a single-vendor feature.
- Notes: Supports "flexible icon/widget placement is not new on Android" without claiming Android "invented" it.

## S009
- Title: How to customize Quick Settings tiles in Android 12
- Organization/Author: Android Central
- URL: https://www.androidcentral.com/how-customize-quick-settings-tiles-android-12
- Publish date: 2021
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Android Quick Settings has long supported an edit mode (pencil icon) to add, remove, and drag-reorder tiles; third-party apps can register custom Quick Settings tiles via a documented Android API (developer.android.com/develop/ui/views/quicksettings-tiles).
- Limitations: Tile resizing/precise repositioning is newer (Android 16 / Pixel); older Android didn't resize tiles. Not every claim about iOS 18 Control Center maps 1:1 — Android tiles are more uniform.
- Notes: Supports "editable quick toggles + third-party toggles existed on Android first," with the resize caveat.

## S010
- Title: Create custom Quick Settings tiles for your app
- Organization/Author: Android Developers (Google)
- URL: https://developer.android.com/develop/ui/views/quicksettings-tiles
- Publish date: not dated (evergreen docs; API since Android 7.0, 2016)
- Access date: 2026-09-10
- Source type: 1
- Reliability: fact
- Claims supported: The `TileService` API letting third-party apps add a Quick Settings tile has existed since Android 7.0 (API level 24), 2016.
- Limitations: API existence ≠ every app uses it.
- Notes: Hard official anchor for "third-party quick toggles on Android since 2016."

## S011
- Title: Android 15's Private Space is like a secret vault for your sensitive apps
- Organization/Author: Android Authority
- URL: https://www.androidauthority.com/private-space-android-15-3443454/
- Publish date: 2024
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Android 15 added a native Private Space: a separate authenticated environment that hides its apps from the app list, recents, notifications, and settings. Before that, Samsung Secure Folder (Knox-based, since 2017) and Xiaomi/MIUI App Lock offered per-app locking and hiding on specific skins.
- Limitations: Private Space is Android 15+ and stock; Secure Folder is Samsung-only; MIUI App Lock is Xiaomi-only. There was no single universal Android app-lock before Android 15 — it was skin-dependent.
- Notes: Critical nuance — do NOT say "Android has had this for years" flatly; say specific skins did, and stock Android formalized it in Android 15 (2024).

## S012
- Title: 'App Lock' coming to Samsung's Android 15 update alongside Secure Folder
- Organization/Author: TechTimes
- URL: https://www.techtimes.com/articles/305995/20240624/app-lock-coming-samsung-s-android-15-update-alongside-secure.htm
- Publish date: 2024-06-24
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Samsung has offered Secure Folder for years; native per-app "App Lock" (Face/fingerprint prompt on app open) came to Samsung more recently.
- Limitations: Samsung-specific.
- Notes: Reinforces the skin-dependent framing for S011.

## S013
- Title: Mua iPhone Duo — Apple (VN)
- Organization/Author: Apple Vietnam (official online store)
- URL: https://www.apple.com/vn/shop/buy-iphone/iphone-duo
- Publish date: 2026-09 (event Sept 2026)
- Access date: 2026-09-10
- Source type: 1
- Reliability: fact
- Claims supported: Official Vietnam pricing — iPhone Duo 256GB 64.999.000₫, 512GB 71.499.000₫, 1TB 84.499.000₫, 2TB 103.999.000₫. 7.6" foldable inner display + 5.4" outer, titanium frame and hinge cover, colors Trắng Ánh Sao and Trời Đêm. Pre-order 16/10, on sale 23/10.
- Limitations: Store page; spec depth limited vs a full tech-specs page.
- Notes: PRIMARY source for the iPhone Duo price comparison. 2TB = 103.999.000₫.

## S014
- Title: Apple announces the iPhone Duo, the company's first foldable phone
- Organization/Author: Engadget
- URL: https://www.engadget.com/2254027/apple-iphone-duo-announced-specs-price/
- Publish date: 2026-09-09
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: iPhone Duo is Apple's first foldable; book-style fold; 7.6" inner + 5.4" outer Super Retina XDR, up to 3000 nits; mirror-polished titanium frame + 3D-printed titanium hinge; IP68; nano-texture inner panel hides the fold line; uses Touch ID in the side button (not Face ID); A20 Pro chip; US base price $1,999; pre-order Oct 16, on sale Oct 23; announced at the "Surprise and Shine" event Sept 2026.
- Limitations: Tech press event coverage.
- Notes: Note for script — the Duo uses Touch ID, so the "lock apps with Face ID" line must stay a general-iPhone statement.

## S015
- Title: Giá iPhone Duo cao nhất hơn 100 triệu đồng tại Việt Nam
- Organization/Author: Báo Dân trí
- URL: https://dantri.com.vn/cong-nghe/gia-iphone-duo-cao-nhat-hon-100-trieu-dong-tai-viet-nam-20260908171851193.htm
- Publish date: 2026-09-08
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Vietnamese-market reporting of the same tiered pricing (256GB ~65tr up to 2TB ~104tr); first iPhone to pass 100 million VND in Vietnam.
- Limitations: Reports official prices; rounds figures.
- Notes: Corroborates S013.

## S016
- Title: Sống đủ lâu để thấy 1 chiếc iPhone giá trăm triệu, đắt ngang Honda SH
- Organization/Author: Soha / Tổ Quốc
- URL: https://soha.vn/song-du-lau-de-thay-1-chiec-iphone-gia-tram-trieu-dat-ngang-honda-sh-198260910101019895.htm
- Publish date: 2026-09-10
- Access date: 2026-09-10
- Source type: 4
- Reliability: expert_opinion
- Claims supported: Vietnamese tech media itself drew the "iPhone Duo ≈ price of a Honda SH" comparison.
- Limitations: This is commentary/framing by the outlet, not a price authority. Use it to show the comparison is a shared public reaction, not our invention — cite S013 + S017 for the actual numbers.
- Notes: Good for the "this comparison is already in the air" beat.

## S017
- Title: Giá lăn bánh SH160i 2026 tại TP.HCM mới nhất từng phiên bản CBS và ABS / Bảng giá xe SH 160i
- Organization/Author: hoangvietmotors.com.vn; giaxe.2banh.vn
- URL: https://hoangvietmotors.com.vn/blogs/news/gia-lan-banh-sh160i-2026-tai-tp-hcm-moi-nhat-tung-phien-ban-cbs-va-abs ; https://giaxe.2banh.vn/thi-truong/gia-xe-sh-160i-moi-nhat-hom-nay-365.html
- Publish date: 2026-08/09
- Access date: 2026-09-10
- Source type: 4
- Reliability: fact
- Claims supported: Honda SH 160i 2026 has 4 versions (Standard CBS, Premium ABS, Special/Đặc biệt ABS, Sport ABS). SH 160i ABS Đặc biệt manufacturer suggested retail price ≈ 103.990.000₫; on-the-road (lăn bánh) ≈ 113 million ₫; dealer prices vary.
- Limitations: Dealer/aggregator sites, not Honda Vietnam's own page; real transaction prices fluctuate with dealer markup ("bia kèm lạc") and location. Honda's official MSRP is the stable figure.
- Notes: iPhone Duo 2TB (103.999.000₫, S013) vs SH 160i ABS Đặc biệt MSRP (103.990.000₫) — within ~9,000₫. Frame as "list price of the top iPhone Duo ≈ list price of a top-spec SH," not "more expensive than an SH."

## S018
- Title: Apple unveils iOS 18 with new home screen customization, Control Center revamp, more / "Android-style home screen"
- Organization/Author: 9to5Mac; Malay Mail
- URL: https://9to5mac.com/2024/06/10/ios-18-new-features-launch-release-date/ ; https://www.malaymail.com/news/tech-gadgets/2024/06/11/ios-18-android-style-home-screen-revamped-photos-app-and-hide-your-apps/139139
- Publish date: 2024-06-10/11
- Access date: 2026-09-10
- Source type: 4
- Reliability: expert_opinion
- Claims supported: At launch, mainstream tech media themselves described iOS 18's Home Screen freedom as "Android-style" and framed several iOS 18 features as catch-up.
- Limitations: Framing/opinion by outlets, not a factual claim about invention priority.
- Notes: Supports that the video's hook reflects a widely-shared press reaction, not a fringe take.

---

# Visual Assets Used In The Video

Every image below is pulled from an official manufacturer press/support page. Each
entry records: source, page URL, direct file URL, what it shows, where it is used
in the video, and a rights note. No source is fabricated. Where reuse rights are
not explicitly granted for third-party video, the asset is flagged
**SOURCE/RIGHTS NEED VERIFICATION** and used under an editorial/commentary
rationale only.

The Apple Newsroom images all come from ONE article — S001,
https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
— as its official inline press renders. The per-file URLs recorded below were the
live inline asset URLs on 2026-09-10; Apple periodically renames inline assets, so
the article URL is the stable citation. Local filenames (e.g.
`apple_ios18_home_tinted_green.jpg`) are our own; each was visually checked against
the caption it is cited for before use.

## S019 — apple_ios18_home_tinted_green.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-Home-Screen-dark-effect-tinted-240610_inline.jpg.large.jpg
- Article caption: "Users can choose between a light, dark, or tinted look…" / "arranging apps and widgets in any open space."
- Shows: iOS 18 Home Screen, tinted (wallpaper-matched) dark app icons, official iPhone render.
- Used in: Shot 01 (hook hero screenshot); Shot 03 (iOS 18 side of "Android có trước" compare).
- Access date: 2026-09-10
- Rights: Apple Newsroom press asset, used for editorial commentary about iOS 18. **SOURCE/RIGHTS NEED VERIFICATION** for commercial reuse — Apple press images are provided for news/editorial coverage of Apple.

## S020 — apple_ios18_home_larger_icons.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-Home-Screen-240610_inline.jpg.large.jpg
- Article caption: "The Home Screen can be further customized by arranging apps and widgets in any open space."
- Shows: iOS 18 Home Screen with widgets + app icons placed with open gaps / free positioning.
- Used in: Shot 02 (iOS 18 side of "đặt icon tự do" compare).
- Access date: 2026-09-10
- Rights: as S019.

## S021 — apple_ios18_control_center.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-Control-Center-240610_inline.jpg.large.jpg
- Article caption: "Control Center has been redesigned… new levels of customization and flexibility with the ability to add and organize controls."
- Shows: Redesigned iOS 18 Control Center, resized/grouped controls + media widget.
- Used in: Shot 04 (iOS 18 side of "Control Center: tự sắp xếp nút").
- Access date: 2026-09-10
- Rights: as S019.

## S022 — apple_ios18_control_gallery.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-Control-Gallery-240610_inline.jpg.large.jpg
- Article caption: "The new controls gallery displays the full set of available controls, including new controls from third-party apps."
- Shows: iOS 18 controls gallery — searchable list of controls incl. third-party, to add to Control Center.
- Used in: Shot 05 (iOS 18 side of "Quick Settings đã vậy từ lâu").
- Access date: 2026-09-10
- Rights: as S019.

## S023 — apple_ios18_locked_app.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-locked-app-240610_inline.jpg.large.jpg
- Article caption: "apps can be locked with Face ID, Touch ID, or the device passcode, and information from these apps won't surface in search or notifications."
- Shows: The "Require Face ID for 'Photos'?" confirmation dialog.
- Used in: Shot 06 (iOS 18 side of "Khóa app bằng Face ID, ẩn app").
- Access date: 2026-09-10
- Rights: as S019.

## S024 — apple_ios18_hidden_apps.jpg
- Source: Apple Newsroom (official inline press render, article S001)
- Page: https://www.apple.com/newsroom/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/
- File (as captured 2026-09-10): https://www.apple.com/newsroom/images/2024/06/ios-18-makes-iphone-more-personal-capable-and-intelligent-than-ever/article/Apple-WWDC24-iOS-18-hidden-apps-240610_inline.jpg.large.jpg
- Article caption: "Locked apps can be hidden in a dedicated folder in the App Library so they don't appear on the Home Screen."
- Shows: The Hidden folder at the bottom of the App Library.
- Used in: Shot 07 (iOS 18 side of "Android: tùy hãng trước đây").
- Access date: 2026-09-10
- Rights: as S019.

## S025 — samsung_secure_folder.jpg
- Source: Samsung US official support ("Use the Secure Folder on your Galaxy phone")
- Page: https://www.samsung.com/us/support/answer/ANS00082343/
- File: https://image-stgus.samsung.com/SamsungUS/support/solutions/mobile/phones/galaxy-s/s23/PH_S23_Use-the-Secure-Folder-on-your-Galaxy-phone.jpg
- Shows: Samsung Secure Folder open on a Galaxy phone, its app grid visible.
- Used in: Shot 07 (Android side — evidence that per-app hiding existed on Samsung since 2017).
- Access date: 2026-09-10
- Note: Low resolution (400×272) — the only official Samsung image of this screen. Shown small.
- Rights: Samsung support-site image used for editorial reference to the Samsung feature it documents. **SOURCE/RIGHTS NEED VERIFICATION** for commercial reuse.

## S026 — apple_iphone_duo_opening.jpg
- Source: Apple Newsroom (official press image)
- Page: https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/
- File: https://www.apple.com/newsroom/images/2026/09/apple-unveils-iphone-duo/tile/Apple-iPhone-Duo-opening-iPhone-Duo-260909-lp.jpg.landing-big_2x.jpg
- Shows: iPhone Duo held open in two hands, inner foldable display active.
- Used in: Shot 12 (iPhone Duo reveal) and Shot 13 (price comparison — iPhone side).
- Access date: 2026-09-10
- Rights: as S019.

## S027 — honda_sh160i_side.png
- Source: Honda Vietnam official product configurator (360° image set)
- Page: https://www.honda.com.vn/xe-may/san-pham/sh160i125i?version=100
- File: https://cdn.honda.com.vn/motorbike-versions/Image360/November2025/1762227291/0.png
- Shows: Honda SH 160i, grey ("Special/Đặc biệt"-style) colourway, clean left-side studio render, transparent background, no text.
- Used in: Shot 13 (price comparison — Honda side).
- Access date: 2026-09-10
- Rights: Honda Vietnam official product image used for editorial comparison of the product it depicts. **SOURCE/RIGHTS NEED VERIFICATION** for commercial reuse.
