import { resolve, parse, join, dirname, basename, extname, relative } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'fs'
import cheerio from 'cheerio'
import hasha from 'hasha'

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

export default (options = {}) => {
  const { template, target, hash, replaceToMinScripts } = options
  return {
    name: 'html',
    onwrite (config, data) {
      const file = resolve(config.file)
      const p = parse(file)
      const htmlFile = resolve(config.dir || p.dir, target || basename(template))
      const $ = cheerio.load(readFileSync(template).toString(), { decodeEntities: false })
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
