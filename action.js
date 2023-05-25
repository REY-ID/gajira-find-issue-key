const _ = require('lodash')
const Jira = require('./common/net/Jira')

const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g

const eventTemplates = {
  branch: '{{event.ref}}',
  commits: "{{event.commits.map(c=>c.message).join(' ')}}",
}

const maxTitleChar = 35

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
    const issues = {};

    const match = searchStr.match(issueIdRegEx)

    console.log(`Searching in string: \n ${searchStr}`)

    if (!match) {
      console.log(`String does not contain issueKeys`)

      return {
        issues: [],
        has_issues: true,
        markdown: ""
      }
    }

    const uniqueMatch = [...new Set(match)];

    for (const issueKey of uniqueMatch) {
      const issue = await this.Jira.getIssue(issueKey)

      if (issue) {
        issues[issue.key] = issue
      }
    }

    const tasks = Object.values(issues).map(data => {
      const title = data.fields.summary.length > maxTitleChar ? data.fields.summary.substring(0, maxTitleChar) + "..." : data.fields.summary;
      return `:sparkles: *<${this.config.baseUrl}/browse/${data.key}|${data.key}>* ${title}\\n${data.fields.assignee.displayName} - ${data.fields.status.name}`
    });

    const markdown = tasks.join('\\n\\n')

    return {
      issues: Object.keys(issues),
      markdown,
      has_issues: true
    }
  }

  preprocessString (str) {
    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g
    const tmpl = _.template(str)

    return tmpl({ event: this.githubEvent })
  }
}
