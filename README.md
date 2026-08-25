# 商家入口（GitHub Pages 永久版）

把「总检索 hub」托管到 GitHub Pages，得到一个**永不变**的公网 URL。
hub 内部仍指向 3 个稳定的 CloudStudio 分片，所以 CloudStudio 怎么回收都不影响商家入口。

## 为什么这样能根治
- 之前商家入口(hub)跑在 CloudStudio 上，平台会回收工作空间 → 必须重建 → 换新链接 → 重发商家。
- 现在入口在 GitHub Pages：GitHub 不回收静态站点，URL **永久固定**。
- 3 个 CloudStudio 分片本身稳定（多次验证从不掉），继续承担 PDF 存储与下载。

## 首次发布（只需一次）
1. 在 GitHub 新建一个**公开**仓库，例如 `guotie-merchant-hub`。
2. 在本目录设置远程并推送：
   ```bash
   cd merchant-hub
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin master
   ```
   > 若用令牌(PAT)推送，可把远程写成
   > `https://<TOKEN>@github.com/<用户>/<仓库>.git`（令牌仅 repo 写权限）。
3. 仓库 **Settings → Pages → Source 选 `master` 分支 / root** 保存。
4. 稍等约 1 分钟，商家 URL 即为：
   **https://\<你的用户名\>.github.io/\<仓库名\>/**

## 之后每次同步（自动）
「同步商家网站」自动化在分片发布完成后会调用 `merchant-hub/sync.py`：
自动把 `dist_hub` 里最新的 `shards.json`（订单索引）复制进来并提交推送。
**商家 URL 不变**，只是索引变新。

## 文件说明
- `index.html` / `hub.js` / `style.css`：检索页（相对路径，适配 GitHub Pages 子路径）
- `shards.json`：各分片订单索引 + 分片 URL（由 publish.py 生成）
- `.nojekyll`：禁用 Jekyll 处理，确保静态文件原样托管
- `sync.py`：同步脚本（dist_hub → 本仓库 → push）

## 注意
- 数据含收货人等敏感信息，已公开到公网，请知悉泄露风险。
- 仅当新增第 4 个分片等极少数情况才需改 hub 代码；日常只需 sync.py 更新索引。
