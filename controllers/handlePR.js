'use strict'

const path = require('path')
const config = require(path.join(__dirname, '/../config'))
const GitHub = require(path.join(__dirname, '/../lib/GitHub'))
const Staticman = require('../lib/Staticman')

module.exports = (repo, data) => {
  const ua = config.get('analytics.uaTrackingId')
    ? require('universal-analytics')(config.get('analytics.uaTrackingId'))
    : null

  if (!data.number) {
    return
  }

  const github = new GitHub()

  github.authenticateWithToken(config.get('githubToken'))

  return github.api.pullRequests.get({
    user: data.repository.owner.login,
    repo: data.repository.name,
    number: data.number
  }).then(response => {
    if (response.head.ref.indexOf('staticman_')) {
      return null
    }

    if (response.merged) {
      const bodyMatch = response.body.match(/(?:.*?)<!--staticman_notification:(.+?)-->(?:.*?)/i)

      if (bodyMatch && (bodyMatch.length === 2)) {
        try {
          const parsedBody = JSON.parse(bodyMatch[1])
          const staticman = new Staticman(parsedBody.parameters)

          staticman.authenticate()
          staticman.setConfigPath(parsedBody.configPath)
          staticman.processMerge(parsedBody.fields, parsedBody.options).catch(err => {
            return Promise.reject(err)
          })
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }

    if (response.state === 'closed') {
      return github.api.gitdata.deleteReference({
        user: data.repository.owner.login,
        repo: data.repository.name,
        ref: 'heads/' + response.head.ref
      })
    }
  }).then(response => {
    if (ua) {
      ua.event('Hooks', 'Delete branch').send()
    }

    return response
  }).catch(err => {
    console.log(err.stack || err)

    if (ua) {
      ua.event('Hooks', 'Delete branch error').send()
    }

    return Promise.reject(err)
  })
}
