# Han Wang — Collected Encounters

纯 HTML / CSS / JavaScript 摄影、影片、人物故事与旅行网站，无需构建。

## 编辑

打开 index.html，点击页底「编辑网站」。可上传照片、分类摄影、添加 YouTube 视频、在人物故事中填写日期、地点、经纬度与富文本文章，并添加旅行记录。简介和封面在编辑模式的首页修改。

本版本没有预置个人作品。地图使用 Leaflet 与 OpenStreetMap，需联网。嵌入影片使用 YouTube 隐私增强域名；影片是否允许嵌入由上传者决定。

编辑保存到当前浏览器的 localStorage。任何访客均可进入本地编辑，但不能更改 GitHub 上的内容。无需也不存在管理员密码。需要跨设备或公开更新时，点击「导出网站 HTML」，将导出的 index.html 替换仓库同名文件并提交。JSON 可用于备份和导入。浏览器存储容量有限，建议使用压缩图片或外部图片 URL，并及时导出备份。公开 HTML 中会包含导出的照片、文章和坐标，请仅发布愿意公开的内容。

## GitHub Pages

1. 新建 GitHub 仓库，将本文件夹内所有文件上传，包括 `.github/workflows/pages.yml`，默认分支使用 main。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
3. 推送 main 分支后，等待 Publish portfolio 工作流成功；Actions 的部署任务会显示最终地址。
4. 每次替换 index.html 并提交，网站自动更新。

也可在 Settings → Pages 选择 Deploy from a branch → main / root，直接发布 index.html。

源码直接在任意超文本编辑器中修改。默认公开内容位于 HTML 的 `script#site-data` JSON 中；不要将 GitHub token、密码等秘密写入 HTML。
