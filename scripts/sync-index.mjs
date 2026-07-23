/**
 * 將 standalone/app.logic.jsx + styles.css 打包成可 file:// 開啟的 index.html
 * 執行：npm run sync:index
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const styles = readFileSync(join(root, 'styles.css'), 'utf8');
const hierarchy = readFileSync(join(root, 'standalone', 'hierarchySeed.js'), 'utf8');
const partnerCatalog = readFileSync(join(root, 'standalone', 'partnerChannelCatalog.js'), 'utf8');
const productSeed = readFileSync(join(root, 'standalone', 'warehouseProductSeed.js'), 'utf8');
const logic = readFileSync(join(root, 'standalone', 'app.logic.jsx'), 'utf8');

const html = `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UrMart - 虛擬倉</title>
    <link rel="stylesheet" href="https://unpkg.com/antd@5.24.2/dist/reset.css" />
    <style>
${styles}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"><\/script>
    <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"><\/script>
    <script src="https://unpkg.com/dayjs@1.11.13/dayjs.min.js"><\/script>
    <script src="https://unpkg.com/dayjs@1.11.13/locale/zh-tw.js"><\/script>
    <script src="https://unpkg.com/antd@5.24.2/dist/antd.min.js"><\/script>
    <script src="https://unpkg.com/@ant-design/icons@5.6.1/dist/index.umd.min.js"><\/script>
    <script src="https://unpkg.com/@babel/standalone@7.26.9/babel.min.js"><\/script>
    <script type="text/babel" data-presets="react">
${partnerCatalog}
${hierarchy}
${productSeed}
${logic}
    </script>
  </body>
</html>
`;

writeFileSync(join(root, 'index.html'), html, 'utf8');
console.log('✓ index.html 已同步（單檔可 file:// 開啟，需網路載入 CDN）');
