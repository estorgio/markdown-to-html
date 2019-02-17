'use strict';
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const hljs = require('highlight.js');
const md = require('markdown-it')(getMarkdownOptions());
const $ = require('cheerio');

const outputDirectory = path.resolve(process.cwd(), 'output');

console.log('Markdown compiler has been started');

chokidar.watch(process.cwd(), { ignored: /(\/output\/)|(\\output\\)/ })
  .on('add', path => processFile(path))
  .on('change', path => processFile(path));

async function processFile(filePath) {

  if (/\/node_modules\//.test(filePath)) return;
  if (/\/output\//.test(filePath)) return;

  await sleep(1000);

  switch (path.extname(filePath).toLowerCase()) {
    case '.md':
      await convertToHTML(filePath);
      break;
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
      await copyImageToOutput(filePath);
  }
}

async function convertToHTML(markdownFile) {
  await sleep(1000);

  console.log('Converting ', markdownFile);
  const fname = path.basename(markdownFile, '.md');

  let outfile = path.resolve(outputDirectory,
    path.relative(process.cwd(), markdownFile));
  outfile = path.join(path.dirname(outfile),
    path.parse(outfile).name + '.html');
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  const content = fs.readFileSync(markdownFile, 'utf8');
  
  let htmlContent = md.render(content);
  htmlContent = loadTemplate(htmlContent);
  htmlContent = convertMDLinksToHtml(htmlContent, markdownFile);
  
  fs.writeFileSync(outfile, htmlContent);
}

async function copyImageToOutput(filePath) {
  console.log('Copying image to output dir:', filePath);

  let outfile = path.resolve(outputDirectory,
    path.relative(process.cwd(), filePath));
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  fs.copyFileSync(filePath, outfile);
}

function loadTemplate(content) {
  const html = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf-8');
  const css = fs.readFileSync(path.resolve(__dirname, 'style.css'), 'utf8');
  const $source = $.load(html);
  $source('head').append(`<style>${css}</style>`);
  $source('body>div.container').html(content);
  return $source.html();
}

function sleep(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms));
}

function convertMDLinksToHtml(htmlSource, filePath) {
  const $source = $.load(htmlSource);
  $source('a').each((index, element) => {
    const href = $(element).attr('href');

    if (href.indexOf('http://') >= 0 || href.indexOf('https://') >= 0)
      return;

    const localPath = path.resolve(path.dirname(filePath), href);
    if (!fs.existsSync(localPath) || path.extname(localPath).toLowerCase() !== '.md')
      return;

    const parsedHref = path.parse(href);
    const newHref = path.join(parsedHref.dir, parsedHref.name + '.html');

    $(element).attr('href', newHref);
  });
  return $source.html();
}

function getMarkdownOptions() {
  return {
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (__) {}
      }
      return '';
    }
  };
}