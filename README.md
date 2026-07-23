# UrMart 虛擬倉 2.0

UrMart 虛擬倉管理介面原型，支援 L1 總倉、L2 通路分組、L3 銷售通路的階層式庫存檢視與配貨操作。

## 功能概覽

- **階層篩選**：依 L1 總倉 / L2 通路分組 / L3 銷售通路切換檢視
- **L2 通路分組管理**：新增、編輯、刪除 L2 分組，設定 L3 歸屬與驗收規則
- **單筆 / 批量配貨**：支援 L1 → L2 或 L1 → L3 雙軌配貨
- **Mock 資料**：內建種子資料，可離線開發與展示

## 技術棧

- React 18 + Vite 6
- Ant Design 5
- TypeScript（部分模組）

## 快速開始

```bash
# 安裝依賴
npm install

# 開發模式（預設開啟 http://localhost:5173/dev.html）
npm run dev

# 建置
npm run build

# 預覽建置結果
npm run preview
```

## 專案結構

```
├── src/
│   ├── api/              # API 層（含 mock）
│   ├── components/       # UI 元件
│   ├── data/             # 種子資料
│   ├── hooks/            # React hooks
│   ├── pages/            # 頁面
│   ├── types/            # TypeScript 型別
│   └── utils/            # 工具函式
├── standalone/           # 獨立版（file:// 可直接開啟 index.html）
├── docs/                 # 業務邏輯文件
├── dev.html              # Vite 開發入口
└── index.html            # Standalone 入口
```

## 業務邏輯

配貨與出貨規則說明請參考 [`docs/allocation-logic.md`](docs/allocation-logic.md)。

## 授權

Private — UrMart internal use.
