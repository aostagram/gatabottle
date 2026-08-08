## ⚠️ サービス終了について

潟ボトルはサービスを終了しました。現在このリポジトリは、トップページに
「サービス終了のお知らせ」を出すだけの**静的サイト**です。

- 投稿（`/post`）・ランキング（`/ranking`）・開封履歴（`/history`）の各ページは廃止し、
  `next.config.ts` のリダイレクトでトップへ寄せています。
- 投稿・開封・いいねの Server Actions と DB クライアント（`src/lib/actions.ts` /
  `src/lib/db.ts`）は削除済みです。**アプリ実行時に Turso へ接続しません**
  （＝リクエストごとの DB クレジット消費が発生しません）。
- そのため `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` はアプリの実行に不要です。
  DB 自体を消してもサイトは動きます。
- `scripts/migrate.mjs` / `scripts/seed.mjs` と `src/lib/schema.sql` は、
  データの退避や将来の復活用に残してあります（実行時には動きません）。
- 終了日の表記は `src/app/page.tsx` の `SERVICE_END_LABEL` を書き換えてください。

以前の機能一式は Git 履歴（`a7c09e1` 以前）に残っています。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
