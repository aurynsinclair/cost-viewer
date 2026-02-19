# Cost Viewer

AI/クラウドサービスのコストを、月次確定前に円建てで確認するCLIツール。

## 対応プロバイダー

- AWS (Cost Explorer API)
- OpenAI (Admin API)
- GCP (BigQuery billing export)

## インストール

```bash
npm install
```

## 使い方

### AWS

```bash
# 環境変数でプロファイルを設定（推奨）
export AWS_PROFILE=cost-viewer
npx tsx src/cli.ts aws

# またはオプションで直接指定
npx tsx src/cli.ts aws --profile cost-viewer

# 期間指定
npx tsx src/cli.ts aws --start 2026-01-01 --end 2026-01-31

# 月次集計
npx tsx src/cli.ts aws --granularity MONTHLY
```

### OpenAI

```bash
# 環境変数でAPIキーを設定（推奨）
export OPENAI_ADMIN_API_KEY=sk-admin-...
npx tsx src/cli.ts openai

# または直接指定
npx tsx src/cli.ts openai --api-key sk-admin-...

# 期間指定
npx tsx src/cli.ts openai --start 2026-02-01 --end 2026-02-19
```

### GCP

```bash
# 環境変数で設定（推奨）
export GCP_PROJECT_ID=my-project
export GCP_BILLING_DATASET=billing_export
export GCP_BILLING_TABLE=gcp_billing_export_v1_XXXXXX
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
npx tsx src/cli.ts gcp

# またはオプションで直接指定
npx tsx src/cli.ts gcp --project my-project --dataset billing_export --table gcp_billing_export_v1_XXXXXX --key-file /path/to/key.json

# 期間指定
npx tsx src/cli.ts gcp --start 2026-02-01 --end 2026-02-20
```

> **注意:** GCP の請求通貨が JPY の場合、為替変換なしで JPY のみ表示されます。

### 出力例

```
AWS Cost Report: 2026-02-01 → 2026-02-19
Profile: cost-viewer | Exchange rate: 1 USD = ¥152.30

Date        Service                    USD         JPY
----------- -------------------------- ----------- -----------
2026-02-01  Amazon EC2                      $1.23       ¥187
2026-02-01  Amazon S3                       $0.45        ¥69
...         ...
----------- -------------------------- ----------- -----------
TOTAL                                      $12.34     ¥1,880
```

---

## AWS セットアップ

### 1. IAMユーザー/ポリシーの作成

このツール専用の最小権限ポリシーを作成してください。

**必要な権限:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ce:GetCostAndUsage"],
    "Resource": "*"
  }]
}
```

> **注意:** Cost Explorer API は `us-east-1` リージョンのみで動作します（グローバルサービス）。

### 2. 認証情報の設定

`~/.aws/credentials` にプロファイルを作成してください。

```bash
# ~/.aws/credentials
[cost-viewer]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

**環境変数で設定（推奨）:**
```bash
# .env ファイルに記載
AWS_PROFILE=cost-viewer

# クレデンシャルファイルのパスを変更する場合（オプション）
# AWS_SHARED_CREDENTIALS_FILE=C:/Users/you/.aws/credentials
```

```bash
# --profile を省略して実行可能
npx tsx src/cli.ts aws
```

---

## OpenAI セットアップ

### Admin API キーの作成

通常のプロジェクトAPIキーとは別に、**Admin API Key** が必要です。

1. [platform.openai.com](https://platform.openai.com) にログイン
2. 左メニュー「**Organization**」→「**Admin API keys**」
3. 「Create new secret key」

### キーの設定

プロジェクト内に保存せず、環境変数を使用してください。

```bash
# 毎回設定する場合
export OPENAI_ADMIN_API_KEY=sk-admin-...

# または PowerShell
$env:OPENAI_ADMIN_API_KEY="sk-admin-..."
```

---

## GCP セットアップ

### 1. BigQuery 請求データエクスポート

GCP Console → 「お支払い」→ 「請求データのエクスポート」で、BigQuery への標準使用料金エクスポートを有効にしてください。

> **注意:** エクスポート設定後、データが BigQuery に反映されるまで数時間〜1日かかります。

### 2. サービスアカウントの作成

BigQuery にクエリを実行するためのサービスアカウントが必要です。

**必要なロール:**
- `roles/bigquery.jobUser`（プロジェクトレベル — クエリ実行権限）
- `roles/bigquery.dataViewer`（データセットレベル — テーブル読み取り権限）

```bash
# サービスアカウント作成
gcloud iam service-accounts create cost-viewer --display-name="Cost Viewer"

# ロール付与
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cost-viewer@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# キーファイル生成
gcloud iam service-accounts keys create key.json \
  --iam-account=cost-viewer@PROJECT_ID.iam.gserviceaccount.com
```

### 3. 認証情報の設定

```bash
# 環境変数で設定
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# または .env ファイルに記載
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

---

## 開発

```bash
# テスト実行
npm test

# ビルド
npm run build
```
