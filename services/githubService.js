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
    async createRepoProject(owner, repo, name) {
        const { data } = await this.octokit.rest.projects.createForRepo({
            owner: owner,
            repo: repo,
            name: name
        });
        return data;
    }
    async createOrgProject(org, name) {
        const { data } = await this.octokit.rest.projects.createForOrg({
            org: org,
            name: name,
        });
        return data;
    }
    async createProjectColumn(projectId, columnName) {
        const { data } = await this.octokit.rest.projects.createColumn({
            project_id: projectId,
            name: columnName,
        });
        return data;
    }
    async getProjects(owner, repo) {
        const { data } = await this.octokit.rest.projects.listForRepo({
            owner: owner,
            repo: repo,
        });
        return data;
    }
    async createRepository(org, name) {
        const { data } = await this.octokit.rest.repos.createInOrg({
            org: org,
            name: name,
        });
        return data;
    }

    
    // TODO: content_id and content_type are required but there are no insights about what they should be https://octokit.github.io/rest.js/v18#projects. maybe we just have to add #IDISSE to the notes to relate an issue with the column
    // async createCard(column_id, note, content_id, content_type) {
    //     const { data } = await this.octokit.rest.projects.createCard({
    //         column_id,
    //         note,
    //         content_id,
    //         content_type,
    //     });
    //     return data;
    // }
    
}
module.exports = GitHubService;