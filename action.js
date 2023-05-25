const _ = require('lodash')
const Jira = require('./common/net/Jira')

const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g

const eventTemplates = {
  branch: '{{event.ref}}',
  commits: "{{event.commits.map(c=>c.message).join(' ')}}",
}

module.exports = class {
  constructor ({ githubEvent, argv, config }) {
    this.Jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    })

    this.config = config
    this.argv = argv
    this.githubEvent = githubEvent
  }

  async execute () {
    if (this.argv.string) {
      const found = await this.findIssueKeyIn(this.argv.string)

      if (found.issues.length) return found
    }
  }

  /**
   * @param {string} searchStr 
   * @returns {Promise<string[]>}
   */
  async findIssueKeyIn (searchStr) {
    const issues = [];

    const match = searchStr.match(issueIdRegEx)

    console.log(`Searching in string: \n ${searchStr}`)

    if (!match) {
      console.log(`String does not contain issueKeys`)

      return {
        issues: [],
        issue_links: []
      }
    }

    for (const issueKey of match) {
      const issue = await this.Jira.getIssue(issueKey)

      console.log(`Found issue: ${JSON.stringify(issue)}`)

      if (issue) {
        issues.push(issue.key)
      }
    }

    const unique = [...new Set(issues)]
    const issue_links = unique.map(issue => `${this.config.baseUrl}/browse/${issue}`);

    return {
      issues: unique,
      issue_links
    }
  }

  preprocessString (str) {
    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g
    const tmpl = _.template(str)

    return tmpl({ event: this.githubEvent })
  }
}
