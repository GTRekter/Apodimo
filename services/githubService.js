const { Octokit } = require("@octokit/rest");

class GitHubService {
    octokit = null;
    constructor(token) {
        this.octokit = new Octokit({
            auth: token
        });
    }
    async getRepos() {
        return await this.octokit.repos.listForAuthenticatedUser({
            type: "owner",
            sort: "updated",
            direction: "desc",
            per_page: 100
        });
    }
    async getUser() {
        return await this.octokit.users.getAuthenticated();
    }

    async addCollaborator(owner, repo, username) {
        // * pull - can pull, but not push to or administer this repository.
        // * push - can pull and push, but not administer this repository.
        // * admin - can pull, push and administer this repository.
        // * maintain - Recommended for project managers who need to manage the repository without access to sensitive or destructive actions.
        // * triage - Recommended for contributors who need to proactively manage issues and pull requests without write access. * custom repository role name - Can assign a custom repository role if the owning organization has defined any.
        await this.octokit.rest.repos.addCollaborator({
            owner: owner,
            repo: repo,
            username: username,
            permission: "push"
        });
    }


    async createPage(owner, repo, branch, path = "/") {
        const { data } = await this.octokit.rest.repos.createPagesSite({
            owner: owner,
            repo: repo,
            source: { // The source branch and directory used to publish your Pages site.
                branch: branch, // The repository branch used to publish your site's source files.
                path: path // The repository directory that includes the source files for the Pages site. Allowed paths are / or /docs. Default: /
            }
        })
        return data;
    }
    async createIssue(owner, repo, title, body, milestone, labels = []) {
        await this.octokit.rest.issues.create({
            owner: owner,
            repo: repo,
            title: title,
            body: body,
            milestone: milestone,
            labels: labels
        });
    }
    async createMilestone(owner, repo, title, state = "open", description = "", due_on) {
        const { data } = await this.octokit.rest.issues.createMilestone({
            owner: owner,
            repo: repo,
            title: title,
            state: state,
            description: description,
            due_on: due_on
        });
        return data;
    }
}
module.exports = GitHubService;