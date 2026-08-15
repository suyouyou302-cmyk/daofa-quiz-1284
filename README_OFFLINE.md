# 离线静态版使用说明

这个文件夹就是完整网页，不依赖网络、后端或在线接口。直接双击 `index.html` 即可使用；刷题进度会保存在当前浏览器的本地存储中。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库。
2. 上传本文件夹里的全部文件：`index.html`、`style.css`、`app.js`、`questions.js`。
3. 打开仓库的 **Settings → Pages**。
4. 选择 **Deploy from a branch**，分支选择 `main`，目录选择 `/ (root)`，保存。
5. 等待 GitHub Pages 发布后，用生成的网址访问即可。

不要删除 `questions.js`，它包含 309 道题库；不要把脚本改成在线 CDN 地址，否则就不再是完全离线版。
