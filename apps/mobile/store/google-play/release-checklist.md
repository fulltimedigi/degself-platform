# Google Play release checklist — DEGSELF Android 1.0

## Listing

- App name: `دق سلف - كراجات الكويت`
- Default language: Arabic
- Category: Auto & Vehicles
- Support email: `info@degself.com`
- Website: `https://degself.com`
- Privacy policy: `https://degself.com/privacy`
- Account deletion URL: `https://degself.com/privacy#data-deletion`
- Ads declaration: No ads
- App access: All core functions are available without login; Google login is optional
- Target audience: 18 and over (conservative fit for vehicle owners; confirm publisher intent)
- Countries/regions: Kuwait first
- Pricing: Free

## Content rating answers for current release

- No violence, sexual content, gambling, controlled substances, or user-to-user communication.
- No user-generated content is displayed or submitted in the Android app.
- The app links to workshop phone/WhatsApp, maps, and safe HTTP(S) business websites.
- The app is a directory and does not perform repairs or process payments.

## Required publisher actions

- [ ] Verify the Google Play developer account and whether it is Personal or Organization.
- [ ] If it is a new Personal account, complete the currently required closed-test period and tester count shown in Play Console before production access.
- [ ] Create the app with package `com.degself.app`; this package identity is permanent after first upload.
- [ ] Add Arabic and English listing text from this directory.
- [ ] Upload the 512×512 Play icon, 1024×500 feature graphic, and real-phone screenshots.
- [ ] Complete Data safety using `data-safety.md`, checking the SDK list from the uploaded AAB.
- [ ] Complete Content rating, Target audience, Ads, App access, and Government/Financial/Health declarations truthfully.
- [ ] Configure Play App Signing and upload the signed production AAB.
- [ ] Run Play pre-launch report and fix crashes, accessibility, security, and compatibility findings.
- [ ] Publish first to Internal testing, then Closed testing, then use a staged Production rollout.

## Build commands

From `apps/mobile` after EAS public environment variables exist for the `production` environment:

```sh
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production
```

The submit profile deliberately targets the **internal** track with a **draft** release. It cannot silently publish to Production.
