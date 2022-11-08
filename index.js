const PRIssueLinkerAction = require('./pr-issue-linker-action')
const github = require('@actions/github')

return new PRIssueLinkerAction({
  pullRequest: github.context.payload.pull_request,
}).run()
