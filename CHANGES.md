# Changelog

## v0.3.1 (2026-02-20)

### Changed
- AWS: `--profile` now falls back to `AWS_PROFILE` env var (consistent with OpenAI/GCP pattern)
- AWS: removed hardcoded `"default"` profile — omit `--profile` to use env var or default credential chain

## v0.3.0 (2026-02-20)

### Added
- GCP cost integration (`cost-viewer gcp`) via BigQuery billing export
- Options: `--project`, `--dataset`, `--table`, `--key-file` (or env vars)
- JPY-native display for GCP (no USD conversion needed)
- Formatter: `sourceCurrency` option for non-USD cost sources

### Changed
- `fillZeroDays` now preserves the source currency from existing entries
- `FormatOptions` gains optional `sourceCurrency` field

## v0.2.1 (2026-02-19)

### Fixed
- OpenAI: fetch all pages when `has_more: true` (pagination support)
- OpenAI: use literal `group_by[]=line_item` in URL (not percent-encoded)

### Added
- OpenAI: show `-` row for days with no costs (`fillZeroDays`)

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
