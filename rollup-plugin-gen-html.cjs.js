const { resolve, parse, join, dirname, basename, extname, relative, isAbsolute } = require('path')
const { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } = require('fs')
const cheerio = require('cheerio')
const hasha = require('hasha')

function _insertRef ({ $, file, hash, code, htmlFile }) {
  if (!existsSync(file)) return
  if (hash) {
    code = code || readFileSync(file).toString()
    const md5 = hasha(code, { algorithm: 'md5' })
    const p = parse(file)
    const old = file
    file = join(p.dir, p.name + '.' + md5 + p.ext)
    existsSync(file) && unlinkSync(file)
    renameSync(old, file)
  }
  const htmlDir = dirname(htmlFile)
  if (extname(file) === '.js') {
    $('<script type="text/javascript"></script>')
      .attr('src', relative(htmlDir, file))
      .appendTo($('body'))
  } else {
    $('<link rel="stylesheet" type="text/css"></link>')
      .attr('href', relative(htmlDir, file))
      .appendTo($('head'))
  }
}

function _replaceToMinScripts ($, htmlFile) {
  $('script').each((idx, elm) => {
    const htmlDir = dirname(htmlFile)
    const p = parse(elm.attribs.src)
    const scriptFile = resolve(htmlDir, p.dir, p.name + '.min' + p.ext)
    if (existsSync(scriptFile)) elm.attribs.src = relative(htmlDir, scriptFile)
  })
}

module.exports = (options = {}) => {
  const { template, target, hash, replaceToMinScripts, cwd = process.cwd() } = options
  return {
    name: 'html',
    onwrite (config, data) {
      const file = resolve(config.file)
      const p = parse(file)
      const htmlFile = resolve(config.dir || p.dir, target || basename(template))
      const tmpContent = readFileSync(isAbsolute(template) ? template : resolve(cwd, template).toString()
      const $ = cheerio.load(tmpContent, { decodeEntities: false })
      if (replaceToMinScripts) _replaceToMinScripts($, htmlFile)
      _insertRef({
        $,
        code: data.code,
        file,
        hash,
        htmlFile
      })
      const cssFile = join(p.dir, p.name + '.css')
      _insertRef({
        $,
        file: cssFile,
        hash,
        htmlFile
      })
      let htmlString = $.html()
      for (let s in options.replaces) {
        let v = options.replaces[s]
        htmlString = htmlString.replace(s, v)
      }
      writeFileSync(htmlFile, htmlString)
    }
  }
}
