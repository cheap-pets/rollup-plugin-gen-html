const { resolve, parse, dirname, basename, extname, relative } = require('path')
const { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } = require('fs')
const { createFilter } = require('rollup-pluginutils')
const cheerio = require('cheerio')
const hasha = require('hasha')

module.exports = (options = {}) => {
  const {
    include,
    exclude,
    template,
    output,
    hash,
    replaceToMinScripts,
    insertCssRef = true,
    title,
    cwd = process.cwd()
  } = options
  const filter = createFilter(include || ['**/*.html'], exclude)
  const html = []
  const hashedFiles = {}

  function _insertRef ({ $, refFile, htmlFile }) {
    // if (!existsSync(ref)) return
    const dir = dirname(htmlFile)
    if (extname(refFile) === '.js') {
      $('<script type="text/javascript"></script>')
        .attr('src', relative(dir, refFile))
        .appendTo($('body'))
    } else {
      $('<link rel="stylesheet" type="text/css"></link>')
        .attr('href', relative(dir, refFile))
        .appendTo($('head'))
    }
  }

  function _replaceToMinScripts ($, htmlFile) {
    $('script').each((idx, elm) => {
      if (Object(elm.attribs).src) {
        const htmlDir = dirname(htmlFile)
        const p = parse(elm.attribs.src)
        const scriptFile = resolve(htmlDir, p.dir, p.name + '.min' + p.ext)
        if (existsSync(scriptFile)) elm.attribs.src = relative(htmlDir, scriptFile)
      }
    })
  }

  function _setTitle ($) {
    const head$ = $('head')
    const title$ = $('title', head$)
    if (title$.length) title$.text(title)
    else $('<title></title>').text(title).appendTo(head$)
  }

  function _writeHtml ({ dir, input, output, code, refFiles }) {
    output = resolve(cwd, output || dir)
    if (!extname(output)) output = resolve(output, basename(input))
    const $ = cheerio.load(code, { decodeEntities: false })
    if (title) _setTitle($)
    if (replaceToMinScripts) _replaceToMinScripts($, output)
    for (let f of refFiles) {
      _insertRef({
        $,
        refFile: resolve(dir, f),
        htmlFile: output
      })
    }
    code = $.html()
    for (let s in options.replaces) {
      let v = options.replaces[s]
      code = code.replace(s, v)
    }
    writeFileSync(output, code)
    return true
  }

  function _renameWithHash (dir, fileName, hash) {
    const { name, ext } = parse(fileName)
    const newFileName = `${name}.${hash}${ext}`
    const filePath = resolve(dir, fileName)
    if (existsSync(filePath)) {
      const newFilePath = resolve(dir, fileName)
      existsSync(newFilePath) && unlinkSync(newFilePath)
      renameSync(filePath, newFileName)
    }
    return newFileName
  }

  function _removeLastHashedFile (id) {
    const file = hashedFiles[id]
    file && existsSync(file) && unlinkSync(file)
  }

  function _getBundleItemHash (item) {
    const content = item.code || item.source
    return content
      ? (hash === true ? hasha(content, { algorithm: 'md5' }) : hash)
      : false
  }

  return {
    name: 'html',
    buildStart () {
      html.length = 0
    },
    transform (code, id) {
      if (filter(id)) {
        html.push({ id, code })
        return {
          code: '',
          map: null
        }
      }
    },
    generateBundle (options, bundle, isWrite) {
      if (!isWrite || (!html.length && !template)) return
      const dir = parse(resolve(options.file)).dir
      const refFiles = []
      for (let key of Object.keys(bundle)) {
        _removeLastHashedFile(key)
        const item = bundle[key]
        const ext = parse(item.fileName).ext.toLowerCase()
        if (ext === '.js' || (insertCssRef && ext === '.css')) {
          const haseCode = _getBundleItemHash(item)
          if (haseCode) {
            item.fileName = hashedFiles[key] = _renameWithHash(dir, item.fileName, haseCode)
          }
          refFiles.push(item.fileName)
        }
      }

      if (html.length) {
        const htmlOutput = (html.length > 1 && output && extname(output)) ? dirname(output) : output
        html.every(({ id, code }) => _writeHtml({
          dir,
          input: id,
          output: htmlOutput,
          code,
          refFiles
        }))
      } else if (template) {
        const input = resolve(cwd, template)
        if (existsSync(input)) {
          const code = readFileSync(input).toString()
          _writeHtml({
            dir,
            input,
            output,
            code,
            refFiles
          })
        }
      }
    }
  }
}
