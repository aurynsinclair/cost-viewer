# Cost Viewer

AI/クラウドサービスのコストを、月次確定前に円建てで確認するCLIツール。

## 対応プロバイダー

- AWS (Cost Explorer API)
- Anthropic, OpenAI, GCP — 今後追加予定

## インストール

```bash
npm install
```

## 使い方

```bash
# 当月のAWSコスト（日次）
npx tsx src/cli.ts aws

# 期間指定
npx tsx src/cli.ts aws --start 2026-01-01 --end 2026-01-31

# 月次集計
npx tsx src/cli.ts aws --granularity MONTHLY

# AWSプロファイル指定
npx tsx src/cli.ts aws --profile cost-viewer
```

### 出力例

```
AWS Cost Report: 2026-02-01 → 2026-02-19
Profile: default | Exchange rate: 1 USD = ¥152.30

Date        Service                    USD         JPY
----------- -------------------------- ----------- -----------
2026-02-01  Amazon EC2                      $1.23       ¥187
2026-02-01  Amazon S3                       $0.45        ¥69
...         ...
----------- -------------------------- ----------- -----------
TOTAL                                      $12.34     ¥1,880
```

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

**または環境変数:**
```bash
AWS_ACCESS_KEY_ID=AKIA... AWS_SECRET_ACCESS_KEY=... npx tsx src/cli.ts aws
```

## 開発

```bash
# テスト実行
npm test

# ビルド
npm run build
```
