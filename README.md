# Overview
Github action to link a pull request to any issues matched within the PR's title or any of the commits

#### Example usage
```yaml
name: PR Issue Linker
on:
  pull_request:
    types: [edited, synchronize, opened, reopened]
jobs:
  pr-issue-linker:
    runs-on: ubuntu-latest
    name: Links referenced issue numbers to the PR
    steps:
      - name: PR Issue Link
        uses: SpiderStrategies/gh-action-pr-issue-linker@main
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```
