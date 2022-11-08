const { BaseAction } = require('gh-action-components')

const HEADER = `<!-- BEGIN PR-ISSUE-LINKER -->`
const FOOTER = `<!-- END PR-ISSUE-LINKER -->`

const TOKEN_REGEX = new RegExp(`${HEADER}[\\s\\S]*?${FOOTER}`,'g')

const URL = 'https://github.com/SpiderStrategies/gh-action-pr-issue-linker'

// From https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/using-keywords-in-issues-and-pull-requests#linking-a-pull-request-to-an-issue
const LINKING_TERMS = ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved']

class PRIssueLinkerAction extends BaseAction {

  constructor(options = {}) {
    super()
    this.options = options
  }

  /*
   * Returns a list of issues that will be closed by this PR. Retrieves
   * the issues from the PR title and all commits within the PR.
   * The description of the PR is ignored b/c github automatically links
   * closed issues within the description.
   */
  async getIssues () {
    let {body, title} = this.options.pullRequest
      , numbers = []

    this.core.debug(`PR body: ${body}`)
    this.core.debug(`PR title: ${title}`)

    // Grab the commits in this PR
    let messages = [title] // Search the PR title. We don't need to search the description b/c github links issues in the description automatically
      , commits = await this.fetchCommits(this.options.pullRequest.number)

    // Add all commit messages
    commits.data.forEach(c => {
      messages.push(c.commit.message)
    })

    this.core.debug(`Searching through the following messages: ${JSON.stringify(messages)}`)

    const re = new RegExp(`(?<=(?:${LINKING_TERMS.join('|')})\\s+)(?:(?<![/\\w-.])#(?<issue>[1-9]\\d*))\\b`, 'gi')

    messages.forEach(message => {
      if (!message) {
        return
      }

      [...message.matchAll(re)]
        .map(({groups = {}}) => `#${groups.issue}`)
        .forEach(issue => {
          numbers.push(issue)
        })
    })

    this.core.debug(`Issue Numbers: ${numbers}`)

    return [...new Set(numbers)] // Smash dups and return
  }

  /*
   * Receives the issues and updates the PR body a github keyword to close
   * the issues
   */
  async linkIssuesToPR (issues) {
    let body = this.options.pullRequest.body || ''
      , title = this.options.pullRequest.title
      , references = issues.map(issue => `fixes ${issue}`).join(', ')

    // Remove the old token
    body = body.replace(TOKEN_REGEX, '')

     // append new token to end of PR body
    body = `${body}
${HEADER}
- - -
&blacktriangleright; _${references}_
<sub>updated ${new Date()} by <a href="${URL}">PR-ISSUE-LINKER</a></sub>
${FOOTER}
`
    this.core.debug(`New PR body: ${body}`)

    await this.execRest((api, opts) => api.pulls.update(opts), {
      pull_number: this.options.pullRequest.number,
      title,
      body
    }, 'Update PR')
  }

  async runAction() {
    try {
      if (!this.options.pullRequest) {
        this.core.info(`Not a pull request, skipping.`)
        return
      }

      this.core.debug('Linking PR to issue')

      let issues = await this.getIssues()

      this.core.debug(`Issues: ${JSON.stringify(issues)}`)

      if (issues.length) {
        this.core.debug('Linking Issues to PR')
        await this.linkIssuesToPR(issues)
      }
    } catch (e) {
      this.core.error('Error linking PR to an issue.')
      this.core.error(e)
    }
  }

}

module.exports = PRIssueLinkerAction
