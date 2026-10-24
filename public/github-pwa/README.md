# SyncTimer QR - GitHub Pages PWA 配布パッケージ

このフォルダ（`public/github-pwa/`）内のファイル一式をGitHubリポジトリにアップロードするだけで、**GitHub Pages 上で完全なPWA（プログレッシブWebアプリ）**として公開できます。

---

## 📁 含まれるファイル一覧

1. **`index.html`**: タイマーアプリ本体（QRコード認識、ポモドーロ時間設定、統計グラフ、印刷機能内蔵）
2. **`manifest.json`**: PWAマニフェスト（GitHub Pagesのサブディレクトリに対応した相対パス仕様）
3. **`sw.js`**: Service Worker（オフラインキャッシュ ＆ PWAインストール対応）
4. **アイコン一式**:
   - `pwa-192x192.png` (192px標準アイコン)
   - `pwa-512x512.png` (512px標準アイコン)
   - `pwa-maskable-512x512.png` (Android用セーフゾーン付きMaskableアイコン)
   - `apple-touch-icon.png` (iOS Safari用アイコン)
   - `icon.svg` & `favicon.ico`

---

## 🚀 GitHub Pages への公開手順 (3ステップ)

### ステップ1: GitHub で新しいリポジトリを作成
1. GitHub にログインし、**「New repository」**をクリックします。
2. リポジトリ名を入力します（例: `synctimer-pwa`）。
3. **「Public」**を選択して作成します。

### ステップ2: ファイルをアップロード
このフォルダ（またはダウンロードした一式）内のすべてのファイル:
- `index.html`
- `manifest.json`
- `sw.js`
- 各種画像ファイル（`*.png`, `*.svg`, `*.ico`）

をリポジトリのルート（トップ階層）にドラッグ＆ドロップしてコミットします。

### ステップ3: GitHub Pages を有効化
1. リポジトリの **「Settings」**（設定）タブを開きます。
2. 左メニューの **「Pages」** をクリックします。
3. **「Build and deployment」** の **Branch** を `main`（または `master`）の `/(root)` に設定し、**「Save」** をクリックします。
4. 数十秒〜1分ほどで、以下のURLでPWAが公開されます:
   ```
   https://<あなたのユーザー名>.github.io/<リポジトリ名>/
   ```

---

## 📱 スマートフォンやPCでのインストール
- **Chrome / Android / Edge**: URLを開くとアドレスバーや画面下部に「ホーム画面に追加」または「インストール」が表示されます。
- **iPhone / Safari**: 画面下部の共有ボタン（四角から上矢印）をタップし、「ホーム画面に追加」を選択します。
