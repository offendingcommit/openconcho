# [0.11.0](https://github.com/offendingcommit/openconcho/compare/v0.10.0...v0.11.0) (2026-05-28)


### Bug Fixes

* harden token and URL handling ([5cfbae6](https://github.com/offendingcommit/openconcho/commit/5cfbae62489c9ec4cc85f30a370b45db269defbc))


### Features

* **docker:** add containerized web build with CORS guidance ([cfe07f1](https://github.com/offendingcommit/openconcho/commit/cfe07f190002c0a6bc9a4433d9cb352147e10c7e))

# [0.10.0](https://github.com/offendingcommit/openconcho/compare/v0.9.0...v0.10.0) (2026-05-28)


### Features

* **api:** add scoped multi-instance query client ([de8db4b](https://github.com/offendingcommit/openconcho/commit/de8db4b7aaccd3337507aacfb93b1ec2f2ac42db))

# [0.9.0](https://github.com/offendingcommit/openconcho/compare/v0.8.0...v0.9.0) (2026-05-28)


### Features

* **web:** add global metadata visibility toggle ([e490d91](https://github.com/offendingcommit/openconcho/commit/e490d911fcb27ee193558fd9a28856cde2057665))
* **web:** add shared Breadcrumb component for workspace pages ([c6afc80](https://github.com/offendingcommit/openconcho/commit/c6afc80fda4ec76b84382f959ecdf9f5a4cf6556))
* **web:** add workspace contextual sub-nav to sidebar ([62cae68](https://github.com/offendingcommit/openconcho/commit/62cae68d05cb0e61594f22611f7d73f13ecd2704))

# [0.8.0](https://github.com/offendingcommit/openconcho/compare/v0.7.1...v0.8.0) (2026-05-15)


### Features

* add health indicator and localhost auto-detect ([38e76d3](https://github.com/offendingcommit/openconcho/commit/38e76d33dea7fb5b31547ff77f5099600894176e))
* add Honcho Cloud connection preset ([f071762](https://github.com/offendingcommit/openconcho/commit/f0717624eb129be82a24c686588085b4c2303bc0))

## [0.7.1](https://github.com/offendingcommit/openconcho/compare/v0.7.0...v0.7.1) (2026-05-12)


### Bug Fixes

* improve dark mode accessibility contrast ([7827438](https://github.com/offendingcommit/openconcho/commit/7827438d9203038c0f2396a3675b6a159229c584))
* show structured page placeholders while loading ([3075e4a](https://github.com/offendingcommit/openconcho/commit/3075e4a005af58e484b0c07074b9423c734946f9))

# [0.7.0](https://github.com/offendingcommit/openconcho/compare/v0.6.0...v0.7.0) (2026-05-04)


### Features

* deep linking for hosted URLs and openconcho:// scheme ([578c8f4](https://github.com/offendingcommit/openconcho/commit/578c8f4c46f470f450414332ee2290edf2ecd344))

# [0.6.0](https://github.com/offendingcommit/openconcho/compare/v0.5.3...v0.6.0) (2026-05-04)


### Features

* support multiple Honcho instances (closes [#2](https://github.com/offendingcommit/openconcho/issues/2)) ([f706c83](https://github.com/offendingcommit/openconcho/commit/f706c83cc15bd35a7222938c580189f710098e2c))

## [0.5.3](https://github.com/offendingcommit/openconcho/compare/v0.5.2...v0.5.3) (2026-05-03)


### Bug Fixes

* **release:** regenerate and commit Cargo.lock on release ([6f9abf8](https://github.com/offendingcommit/openconcho/commit/6f9abf84ff32069c917b8613068b982bc9d28cf1))
* **web:** render sidebar on settings route ([557fecf](https://github.com/offendingcommit/openconcho/commit/557fecf03807b207539e6b50f32b3eec0cfe7191))
* **web:** show settings on first load and hoist DemoProvider globally ([8f5a6aa](https://github.com/offendingcommit/openconcho/commit/8f5a6aa7e9118e182d5959f902f07dafe2026f30))

## [0.5.2](https://github.com/offendingcommit/openconcho/compare/v0.5.1...v0.5.2) (2026-04-28)


### Bug Fixes

* **ci:** make sure we build web before we build the app ([c3b4e58](https://github.com/offendingcommit/openconcho/commit/c3b4e58816f48420ca4970ba1989316690c60391))

## [0.5.1](https://github.com/offendingcommit/openconcho/compare/v0.5.0...v0.5.1) (2026-04-27)


### Bug Fixes

* **release:** route tauri build through turborepo task graph ([6df9f02](https://github.com/offendingcommit/openconcho/commit/6df9f024926a653d53b287a85fb5645d193455f9)), closes [desktop#tauri](https://github.com/desktop/issues/tauri) [web#build](https://github.com/web/issues/build)

# [0.5.0](https://github.com/offendingcommit/openconcho/compare/v0.4.0...v0.5.0) (2026-04-27)


### Bug Fixes

* **release:** sync versions to v0.4.0 and wire up semantic-release npm plugin ([18feaeb](https://github.com/offendingcommit/openconcho/commit/18feaeb3d4f9749b7ca33b26c1912ac99a6e2fb9))
* **release:** use tauri-action beforeBuildCommand for web build ([c66d0f3](https://github.com/offendingcommit/openconcho/commit/c66d0f326ce4209f7298402c20bfcb226616012c))


### Features

* **demo:** extend mask() to all breadcrumbs, page titles, and identifiers ([123828c](https://github.com/offendingcommit/openconcho/commit/123828ccb6e6b14300e73229f70127ac0b1d69bb))
* **demo:** replace blur with asterisk masking of user data via React context ([8f9d806](https://github.com/offendingcommit/openconcho/commit/8f9d806eef3a6d77c3c7b017f8ff23c1177a649b))
* **web:** show app version in sidebar footer via Vite define ([7848d69](https://github.com/offendingcommit/openconcho/commit/7848d69524f739c3139d0c1fdb99c686fc6fdfb5))

# [0.4.0](https://github.com/offendingcommit/openconcho/compare/v0.3.0...v0.4.0) (2026-04-27)


### Bug Fixes

* **demo:** replace redacted font with CSS blur on main content ([7c022d0](https://github.com/offendingcommit/openconcho/commit/7c022d0929d536e113da82cdd164edc6c1b61b1c))


### Features

* add demo mode feature flag using Redacted Script font ([c2e2c83](https://github.com/offendingcommit/openconcho/commit/c2e2c835de7e6faa64e480f57ba1df08addb2577))
* rename Honcho UI to OpenConcho, use SVG logo in sidebar and settings ([d0aba02](https://github.com/offendingcommit/openconcho/commit/d0aba0250d727ac0c696b7af17436504024c760d))

# [0.3.0](https://github.com/offendingcommit/openconcho/compare/v0.2.1...v0.3.0) (2026-04-27)


### Features

* **ci:** add workflow_dispatch to release for manual tag builds ([18905ef](https://github.com/offendingcommit/openconcho/commit/18905ef98740517c0ba87e34495a6bb869af1d34))

## [0.2.1](https://github.com/offendingcommit/openconcho/compare/v0.2.0...v0.2.1) (2026-04-27)


### Bug Fixes

* **ci:** use RELEASE_TOKEN PAT so tag push triggers release workflow ([20bec5c](https://github.com/offendingcommit/openconcho/commit/20bec5c89976416e3bf766f50f6f1a852973e76f))

# [0.2.0](https://github.com/offendingcommit/openconcho/compare/v0.1.0...v0.2.0) (2026-04-27)


### Features

* **ci:** add cargo-check job with Turborepo + Swatinem cache ([5e05d25](https://github.com/offendingcommit/openconcho/commit/5e05d25b463f079cab6a7d55ca0a4a1dfe85fca7))

# [0.1.0](https://github.com/offendingcommit/openconcho/compare/v0.0.0...v0.1.0) (2026-04-27)


### Bug Fixes

* center settings page in full viewport ([88565ea](https://github.com/offendingcommit/openconcho/commit/88565eaf1a90f9febaec04ffb48265d7b9f3dfd5)), closes [#root](https://github.com/offendingcommit/openconcho/issues/root)
* **ci:** fold semantic-release into CI as post-check release job ([bfbc8c1](https://github.com/offendingcommit/openconcho/commit/bfbc8c11480ba80c941ed50a984ec98e6050b7dc))
* **ci:** use GITHUB_TOKEN instead of missing GH_TOKEN secret ([e446efe](https://github.com/offendingcommit/openconcho/commit/e446efea04ed8ef9eae9170aa287aa6863c87bed))
* **desktop:** correct http capability url patterns for non-standard ports ([1d09547](https://github.com/offendingcommit/openconcho/commit/1d09547990440183b7622263dd8083d0c32aba08))
* invert icon to white logo on indigo background ([a519745](https://github.com/offendingcommit/openconcho/commit/a519745f201fc80f9b5ec5ae21b6e77e4b6a2156))
* regenerate Tauri icons with correct indigo background ([1f118d9](https://github.com/offendingcommit/openconcho/commit/1f118d914f87459ff5b5513ca36216de7b56ebb0))
* **release:** wire tauri-action to existing semantic-release GitHub release ([57f89bc](https://github.com/offendingcommit/openconcho/commit/57f89bc0cb54f2a8f8b3632e888a3786298abd17))
* **web:** use esnext build target instead of safari13 ([8052a7d](https://github.com/offendingcommit/openconcho/commit/8052a7d27a6bf0d533feeb62536524d18fab4b58))


### Features

* apply brand colors to logo (indigo favicon, dark-bg Tauri icons) ([35e6c5d](https://github.com/offendingcommit/openconcho/commit/35e6c5df4d317dd66b1df09d0ba330b530fbd460))
* **ci:** multi-platform release matrix for macOS/Linux/Windows ([7379c35](https://github.com/offendingcommit/openconcho/commit/7379c35a6bb15367643ba27db3a3302331c5a122))
* component library, markdown renderer, multi-workspace dashboard ([91c7891](https://github.com/offendingcommit/openconcho/commit/91c78915e51b5704f7b024ec70223c0f3a6c01be))
* full shadcn/ui component system with consistent typography ([9a74182](https://github.com/offendingcommit/openconcho/commit/9a74182f97add5034b432e7f753048c6b223290d))
* restructure as pnpm monorepo with Tauri desktop shell ([92c4dfd](https://github.com/offendingcommit/openconcho/commit/92c4dfd3dd032f7b9662b81007ccfacc20375d18))
* set OpenConcho logo as app icon for web and Tauri ([a07f5ab](https://github.com/offendingcommit/openconcho/commit/a07f5abfc5dafa3cb81f103a6b467c6f63cb3381))
* wire all remaining API endpoints ([45e0183](https://github.com/offendingcommit/openconcho/commit/45e01834398859d2eadcca1abe1eb213e3ff629d))
