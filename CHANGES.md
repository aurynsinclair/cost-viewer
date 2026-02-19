# Changelog

## v0.2.0 (2026-02-19)

### Added
- OpenAI cost integration (`cost-viewer openai`) via Admin API
- Options: `--api-key` (or env `OPENAI_ADMIN_API_KEY`)

### Changed
- `formatTable` now accepts a `title` field (provider-specific report title)
- `profile` in `FormatOptions` is now optional

## v0.1.0 (2026-02-19)

### Added
- Initial release
- AWS Cost Explorer integration (`cost-viewer aws`)
- USD→JPY auto conversion via open.er-api.com
- Options: `--start`, `--end`, `--granularity`, `--profile`
