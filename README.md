# 人格气象

一个完全离线运行的小红书小工具：通过 20 道基础题和最多 2 道定向加测，在 16 种人格气象中生成一种本命气象、一组精简解读和 3:4 截图式结果卡。

朋友测试网址：<https://personality-weather-jianing.netlify.app/>

## 直接下载

朋友可以从 GitHub Release 下载已经打包好的离线版本：

[下载《人格气象》朋友测试版 ZIP](https://github.com/Jianing1117/personality-weather/releases/latest/download/personality-weather-friend-test-v4.zip)

下载后解压，使用浏览器打开根目录中的 `index.html` 即可。测试完全在本地运行，不需要安装依赖，也不会上传昵称和答案。

## 本地运行

```bash
npm run build
python3 -m http.server 4173 -d dist
```

打开 `http://127.0.0.1:4173`。

## 检查

```bash
npm run check
```

生成可以交给小红书 Builder 或发给朋友解压试用的 ZIP：

```bash
npm run package
```

ZIP 的 `index.html` 位于压缩包根目录。题目审稿见 [QUESTION-BANK.md](./QUESTION-BANK.md)，朋友测试时可参考 [FRIEND-TESTING.md](./FRIEND-TESTING.md) 收集反馈。

项目同时包含 `netlify.toml`，部署时发布 `dist/`；公开网址和离线小工具包使用同一份构建产物。

最终上传包必须以 `dist/index.html` 为 ZIP 根入口，不能把 `dist/` 目录本身多包一层。项目不使用网络请求、外部字体、外部图片、内联脚本或受限设备 API。

## 产品边界

- 娱乐型人格内容，不是心理测量、诊断或人生建议。
- 只迁移 SBTI 的交互原则，不复制其题目、人格名称、插画或结果文案。
- 昵称为选填，只在当前设备上用于结果卡，不参与计分，也不上传。
- 第一版的结果图通过页面直接截图，不依赖下载、剪贴板或平台私有分享 API。
- “适配气象”用于寻找聊得来的人；“次生气象”表示本人第二接近的人格，两者不混用。
