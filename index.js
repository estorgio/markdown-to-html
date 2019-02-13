'use strict';
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const showdown = require('showdown');
const $ = require('cheerio');

const customCSSCode = loadCustomCSS();

showdown.setOption('completeHTMLDocument', true);

const outputDirectory = path.resolve(process.cwd(), 'output');

console.log('Markdown compiler has been started');

chokidar.watch(process.cwd())
  .on('add', path => convertToHTML(path))
  .on('change', path => convertToHTML(path));

async function convertToHTML(markdownFile) {
  await sleep(1000);

  if (path.extname(markdownFile) !== '.md') return;
  if (/\/node_modules\//.test('markdownFile')) return;

  console.log('Converting ', markdownFile);
  const fname = path.basename(markdownFile, '.md');
  
  let outfile = path.resolve(outputDirectory,
    path.relative(process.cwd(), markdownFile));
  outfile = path.join(path.dirname(outfile), 
    path.parse(outfile).name + '.html');
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  const converter = new showdown.Converter();
  converter.setFlavor('github');

  const contents = fs.readFileSync(markdownFile, { encoding: 'utf8' });
  let htmlContent = converter.makeHtml(contents);
  htmlContent = injectCSS(htmlContent, customCSSCode);
  htmlContent = convertMDLinksToHtml(htmlContent, markdownFile);
  fs.writeFileSync(outfile, htmlContent);
}

function injectCSS(htmlSource, cssSource) {
  const $source = $.load(htmlSource);
  const $head = $source('head');
  $head.append(`<style>\n${cssSource}\n</style>`);
  const originalBody = $source('body');
  $source('body').html(`<div class="container">${originalBody}</div>`)
  return $source.html();
}

function loadCustomCSS() {
  const css = fs.readFileSync(path.resolve(__dirname, 'style.css'));
  return css;
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