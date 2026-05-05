const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 8080;
const ROOT = path.join(__dirname, '..');

const server = http.createServer((req, res) => {
  // 启用CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const parsedUrl = url.parse(req.url, true);
  let filePath = path.join(ROOT, parsedUrl.pathname);

  // 如果请求的是根目录，返回boards.json
  if (parsedUrl.pathname === '/') {
    filePath = path.join(ROOT, 'boards.json');
  }

  // 处理boards.json请求
  if (parsedUrl.pathname === '/boards.json') {
    filePath = path.join(ROOT, 'boards.json');
  }

  // 处理libraries.json请求
  if (parsedUrl.pathname === '/libraries.json') {
    filePath = path.join(ROOT, '../aily-blockly-libraries/libraries.json');
  }

  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    // 读取文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      // 根据文件扩展名设置Content-Type
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      if (ext === '.json') {
        contentType = 'application/json';
      } else if (ext === '.html') {
        contentType = 'text/html';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Local server running at http://localhost:${port}/`);
  console.log(`Boards JSON available at: http://localhost:${port}/boards.json`);
});