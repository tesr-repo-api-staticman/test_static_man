const CatchAllApiMock = require('./CatchAllApiMock')
const config = require('./../../config')
const objectPath = require('object-path')
const markdownTable = require('markdown-table')
const NodeRSA = require('node-rsa')
const request = require('request-promise-native')
const sampleData = require('./sampleData')
const SiteConfig = require('./../../siteConfig')
const yaml = require('js-yaml')

// Disable console.log() for tests
if (process.env.TEST_DEV !== 'true') {
  console.debug = console.log
  console.log = jest.fn()
  console.warn = jest.fn()
}

const rsa = new NodeRSA()
rsa.importKey(config.get('rsaPrivateKey'))

const fields = {
  name: 'Eduardo Bouças',
  email: 'mail@eduardoboucas.com',
  url: 'https://eduardoboucas.com',
  message: 'This is a sample comment'
}

const parameters = {
  branch: 'master',
  property: 'comments',
  repository: 'foobar',
  username: 'johndoe',
  version: 'v2'
}

module.exports.baseUrl = 

module.exports.decrypt = text => {
  return rsa.decrypt(text, 'utf8')
}

module.exports.encrypt = text => {
  return rsa.encrypt(text, 'base64')
}

module.exports.getCatchAllApiMock = callback => {
  return new CatchAllApiMock(callback)
}

module.exports.getConfig = () => {
  const parsedConfig = yaml.safeLoad(sampleData.config1, 'utf8')
  const reCaptchaSecret = rsa.encrypt('This is a nice little secret', 'base64')

  // For some reason, node-rsa is failing the tests if the secret is encrypted
  // beforehand. As a workaround, we generate a new secret when we retrieve the
  // config object. We can still obtain its raw value with `getRaw().
  parsedConfig.comments.reCaptcha.secret = reCaptchaSecret

  const siteConfig = SiteConfig(parsedConfig.comments, rsa)

  siteConfig.getRaw = key => objectPath.get(parsedConfig, `comments.${key}`)

  return siteConfig
}

module.exports.getConfigObject = () => {
  return {
    file: 'path/to/staticman.yml',
    path: 'comments'
  }
}

module.exports.getFields = () => {
  return Object.assign({}, fields)
}

module.exports.getFieldsTable = () => {
  let rows = [
    ['Field', 'Content']
  ]

  Object.keys(fields).forEach(field => {
    rows.push([field, fields[field]])
  })

  return markdownTable(rows)
}

module.exports.getMockRequest = () => {
  return {
    headers: {
      'x-forwarded-for': '123.456.78.9'
    },
    params: parameters
  }
}

module.exports.getMockResponse = () => {
  const redirectFn = jest.fn()
  const sendFn = jest.fn()
  const statusFn = jest.fn(code => ({
    send: sendFn
  }))

  return {
    redirect: redirectFn,
    send: sendFn,
    status: statusFn
  }
}

module.exports.getParameters = () => parameters

module.exports.getParsedConfig = () => {
  return yaml.safeLoad(sampleData.config1, 'utf8')
}

module.exports.getUserAgent = () => {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
}

module.exports.wrappedRequest = options => {
  const newOptions = typeof options === 'string'
    ? `http://localhost:${config.get('port')}${options}`
    : Object.assign({}, options, {
      uri: `http://localhost:${config.get('port')}${options.uri}`
    })

  return request(newOptions)
}
