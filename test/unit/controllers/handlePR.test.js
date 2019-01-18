const config = require('./../../../config')
const helpers = require('./../../helpers')
const githubToken = config.get('githubToken')
const sampleData = require('./../../helpers/sampleData')

let catchAllMock
let mockAuthenticate
let mockSetConfigPathFn
let mockProcessMergeFn
let req
let res

// Mock Staticman module
jest.mock('./../../../lib/Staticman', () => {
  return jest.fn(parameters => ({
    authenticate: mockAuthenticate,
    setConfigPath: mockSetConfigPathFn,
    processMerge: mockProcessMergeFn
  }))
})

beforeEach(() => {
  mockAuthenticate = jest.fn()
  mockSetConfigPathFn = jest.fn()
  mockProcessMergeFn = jest.fn(() => Promise.resolve(true))
  req = helpers.getMockRequest()
  res = helpers.getMockResponse()

  jest.resetModules()
  jest.unmock('github')  
})

describe('HandlePR controller', () => {
  test('ignores pull requests from branches not prefixed with `staticman_`', () => {
    const pr = {
      number: 123,
      head: {
        ref: 'some-other-branch'
      },
      repository: {
        name: req.params.repository,
        owner: {
          login: req.params.username
        }
      }
    }
    const mockPullRequestsGet = jest.fn(() => Promise.resolve(pr))

    jest.mock('github', () => {
      const GithubApi = function () {}

      GithubApi.prototype.authenticate = jest.fn()
      GithubApi.prototype.pullRequests = {
        get: mockPullRequestsGet
      }

      return GithubApi
    })

    const handlePR = require('./../../../controllers/handlePR')

    return handlePR(req.params.repository, pr).then(response => {
      expect(mockPullRequestsGet).toHaveBeenCalledTimes(1)
      expect(mockPullRequestsGet.mock.calls[0][0]).toEqual({
        user: req.params.username,
        repo: req.params.repository,
        number: pr.number
      })
      expect(response).toBe(null)
    })
  })

  describe('processes notifications if the pull request has been merged', () => {
    test('do nothing if PR body doesn\'t match template', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody2,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'open'
      }
      const mockDeleteReference = jest.fn()
      const mockPullRequestsGet = jest.fn(() => Promise.resolve(pr))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.pullRequests = {
          get: mockPullRequestsGet
        }
        GithubApi.prototype.gitdata = {
          deleteReference: mockDeleteReference
        }

        return GithubApi
      })

      const handlePR = require('./../../../controllers/handlePR')

      return handlePR(req.params.repository, pr).then(response => {
        expect(mockPullRequestsGet).toHaveBeenCalledTimes(1)
        expect(mockDeleteReference).not.toHaveBeenCalled()
      })
    })

    test('abort and return an error if `processMerge` fails', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }
      const mockPullRequestsGet = jest.fn(() => Promise.resolve(pr))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.pullRequests = {
          get: mockPullRequestsGet
        }

        return GithubApi
      })

      const handlePR = require('./../../../controllers/handlePR')
      const errorMessage = 'some error'

      mockProcessMergeFn = jest.fn(() => {
        throw errorMessage
      })

      return handlePR(req.params.repository, pr).catch(err => {
        expect(err).toBe(errorMessage)
        expect(mockPullRequestsGet).toHaveBeenCalledTimes(1)
        expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        expect(mockProcessMergeFn.mock.calls.length).toBe(1)
      })
    })

    test('delete the branch if the pull request is closed', () => {
      const pr = {
        number: 123,
        body: sampleData.prBody1,
        head: {
          ref: 'staticman_1234567'
        },
        merged: true,
        repository: {
          name: req.params.repository,
          owner: {
            login: req.params.username
          }
        },
        state: 'closed'
      }
      const mockDeleteReference = jest.fn()
      const mockPullRequestsGet = jest.fn(() => Promise.resolve(pr))

      jest.mock('github', () => {
        const GithubApi = function () {}

        GithubApi.prototype.authenticate = jest.fn()
        GithubApi.prototype.pullRequests = {
          get: mockPullRequestsGet
        }
        GithubApi.prototype.gitdata = {
          deleteReference: mockDeleteReference
        }

        return GithubApi
      })

      const handlePR = require('./../../../controllers/handlePR')

      return handlePR(req.params.repository, pr).then(response => {
        expect(mockPullRequestsGet).toHaveBeenCalledTimes(1)
        expect(mockPullRequestsGet.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          number: pr.number
        })        
        expect(mockDeleteReference).toHaveBeenCalledTimes(1)
        expect(mockDeleteReference.mock.calls[0][0]).toEqual({
          user: req.params.username,
          repo: req.params.repository,
          ref: `heads/${pr.head.ref}`
        })
        expect(mockSetConfigPathFn.mock.calls.length).toBe(1)
        expect(mockProcessMergeFn.mock.calls.length).toBe(1)
      })
    }) 
  })
})
