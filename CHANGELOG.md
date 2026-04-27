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
