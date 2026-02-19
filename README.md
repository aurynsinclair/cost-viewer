# Cost Viewer

AI/クラウドサービスのコストを、月次確定前に円建てで確認するCLIツール。

## 対応プロバイダー

- AWS (Cost Explorer API)
- OpenAI (Admin API)
- GCP — 今後追加予定

## インストール

```bash
npm install
```

## 使い方

### AWS

```bash
# 当月のAWSコスト（日次）
npx tsx src/cli.ts aws --profile cost-viewer

# 期間指定
npx tsx src/cli.ts aws --profile cost-viewer --start 2026-01-01 --end 2026-01-31

# 月次集計
npx tsx src/cli.ts aws --profile cost-viewer --granularity MONTHLY
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

プロジェクト内に認証情報を保存しないでください。標準のAWS認証チェーンを使用します。

**推奨: AWS プロファイル**
```bash
# ~/.aws/credentials
[cost-viewer]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

```bash
npx tsx src/cli.ts aws --profile cost-viewer
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

## 開発

```bash
# テスト実行
npm test

# ビルド
npm run build
```
