'use strict';
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const showdown = require('showdown');
const $ = require('cheerio');

const customCSSCode = loadCustomCSS();

showdown.setOption('completeHTMLDocument', true);

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
  const outfile = path.join(path.dirname(markdownFile), fname) + '.html';
  
  const converter = new showdown.Converter();
  converter.setFlavor('github');

  const contents = fs.readFileSync(markdownFile, { encoding: 'utf8'});
  let htmlContent = converter.makeHtml(contents);
  htmlContent = injectCSS(htmlContent, customCSSCode);
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

function loadCustomCSS(){
  const css = fs.readFileSync(path.resolve(__dirname, 'style.css'));
  return css;
}

function sleep(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms));
}
