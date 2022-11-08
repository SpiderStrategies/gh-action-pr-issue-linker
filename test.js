const test = require('node:test')
const assert = require('node:assert')
const PRIssueLinkerAction = require('./pr-issue-linker-action')
const { mockCore } = require('gh-action-components')

class ActionStub extends PRIssueLinkerAction {

  constructor(options = {}) {
    super(options)

    this._commits = (options.commits || []).map(message => {
      return {
        commit: {message}
      }
    })
  }

  fetchCommits () {
    return {
      data: this._commits
    }
  }

  async exec(cmd) {
    if (cmd.startsWith('git log')) {
      return this.logOutput
    }
  }
}

test('getCommits -- Empty title and description, no commits', async t => {
  let action = new ActionStub({pullRequest: {}, commits: []})
    , coreMock = mockCore({})

  action.core = coreMock
  assert.deepEqual(await action.getIssues(), [], 'No issues')
})

test('getCommits -- Title and commits', async t => {
  let action = new ActionStub({
      pullRequest: { title: 'Fixes blue smoke' },
      commits: ['fixes #1', 'Resolves #2']
    })
    , coreMock = mockCore({})

  action.core = coreMock

  assert.deepEqual(await action.getIssues(), ['#1', '#2'], 'Two issues')
})

test('getCommits -- Title and commits duplicates', async t => {
  let action = new ActionStub({
      pullRequest: { title: 'Fixes blue smoke resolves #1' },
      commits: ['fixes #1', 'Resolves #2']
    })
    , coreMock = mockCore({})

  action.core = coreMock

  assert.deepEqual(await action.getIssues(), ['#1', '#2'], 'Two issues')
})

test('getCommits -- all resolved words', async t => {
  let action = new ActionStub({
      pullRequest: { title: 'Fixes blue smoke resolves #1' },
      commits: ['close #1', 'closes #2', 'closed #3', 'fix #4', 'fixes #5', 'fixed #6', 'resolve #7', 'resolves #8', 'resolved #9']
    })
    , coreMock = mockCore({})

  action.core = coreMock

  assert.deepEqual(await action.getIssues(), ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9'], 'Two issues')
})

test('linkIssuesToPR - empty body', async t => {
  let action = new ActionStub({pullRequest: { title: 'PR Title' } })
    , coreMock = mockCore({})

  action.core = coreMock

  action.execRest = (api, opts, label) => {
    assert.equal(opts.title, 'PR Title', 'title option set')
    assert(opts.body.includes, '_fixes #1, fixes #2_', 'body contains the fixes')
  }

  await action.linkIssuesToPR(['#1', '#2'])
})

test('linkIssuesToPR - adds to body', async t => {
  let action = new ActionStub({pullRequest: { title: 'PR Title', body: 'My body' } })
    , coreMock = mockCore({})

  action.core = coreMock

  action.execRest = (api, opts, label) => {
    assert.equal(opts.title, 'PR Title', 'title option set')
    assert(opts.body.includes, '_fixes #1_', 'body contains the fixes')
    assert(opts.body.includes, 'My body', 'body contains original text')
  }

  await action.linkIssuesToPR(['#1'])
})
