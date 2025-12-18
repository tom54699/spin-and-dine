# Spin and Dine

一個純前端、可部署到 GitHub Pages 的餐廳轉盤小工具。資料儲存在瀏覽器 `localStorage`，並提供匯出/匯入備份，方便跨裝置使用。

## 功能需求
- 兩個頁面：`轉盤` 與 `餐廳名單`，透過頁籤切換。
- 在「餐廳名單」新增餐廳後，會立即出現在「轉盤」可抽選的名單中。
- 轉盤開始後隨機選出今天要吃的餐廳；選中後自動將該餐廳標記為「今天吃過」並更新最後食用日期。
- 排除規則（在轉盤頁選擇）：不排除 / 排除 7 天內 / 排除 30 天內吃過的餐廳。
- 餐廳名單頁面操作：
  - 新增餐廳。
  - 刪除餐廳。
  - 手動標記「今天吃」更新最後食用日期。
- 資料儲存：瀏覽器 `localStorage`；無需後端即可運作。
- 備份機制：可匯出 JSON 檔，亦可從 JSON 匯入恢復名單。
- 響應式版面，適合桌機與手機。

## 快速開始（本機預覽）
```bash
cd /Users/myaninnovation/Documents/Lunch
python -m http.server 8000
# 瀏覽 http://localhost:8000
```

## 部署到 GitHub Pages
1. Repo Settings → Pages → Build and deployment → Source 選「GitHub Actions」並儲存。
2. 推送到 `main` 分支，GitHub Actions 會自動執行 `.github/workflows/pages.yml` 並發布。

## 主要檔案
- `index.html`：轉盤與餐廳名單的全部前端程式。
- `.github/workflows/pages.yml`：GitHub Pages 自動部署流程。

## 匯出 / 匯入資料
- 匯出：按「匯出 JSON」下載 `restaurants.json`。
- 匯入：按「匯入 JSON」並選擇檔案，名單會覆蓋為檔案內容。

## 已知限制
- 資料存於瀏覽器本機，如清除瀏覽器資料會遺失，請定期匯出備份。
- 權重/偏好設定目前未實作，如需可再新增。
