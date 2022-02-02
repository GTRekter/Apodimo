const vsoNodeApi = require('azure-devops-node-api'); 

class AzureDevOpsService {
    connection = null;
    constructor(token, serverUrl) { 
        let authHandler = vsoNodeApi.getPersonalAccessTokenHandler(token); 
        this.connection = new vsoNodeApi.WebApi(serverUrl, authHandler);   
    }
    async getRepos() {
        let gitApi = await this.connection.getGitApi();
        let repos = await gitApi.getRepositories();
        return repos;
    }

    async getWikis() {
        let wikiApi = await this.connection.getWikiApi();
        let data = await wikiApi.getWikis();
        return data;
    }



    async getWikisByProjectName(project) {
        let wikiApi = await this.connection.getWikiApi();
        let wikis = await wikiApi.getAllWikis(project);
        return wikis;
    }
    async getPagesByWikiId(project, id) {
        let wikiApi = await this.connection.getWikiApi();
        let data = await wikiApi.getPageText(project, id, null, "Full", null, false);
        return JSON.parse(data.read().toString());
    }
    async getPageTextByWikiId(project, id, path) {
        //  /**
        //  * Gets metadata or content of the wiki page for the provided path. Content negotiation is done based on the `Accept` header sent in the request.
        //  * 
        //  * @param {string} project - Project ID or project name
        //  * @param {string} wikiIdentifier - Wiki ID or wiki name.
        //  * @param {string} path - Wiki page path.
        //  * @param {GitInterfaces.VersionControlRecursionType} recursionLevel - Recursion level for subpages retrieval. Defaults to `None` (Optional).
        //  *  VersionControlRecursionType: {
        //         enumValues: {
        //             "none": 0,
        //             "oneLevel": 1,
        //             "oneLevelPlusNestedEmptyFolders": 4,
        //             "full": 120
        //         }
        //     },
        //  * @param {GitInterfaces.GitVersionDescriptor} versionDescriptor - GitVersionDescriptor for the page. Defaults to the default branch (Optional).
        //     export interface GitVersionDescriptor {
        //         version?: string;
        //         versionOptions?: GitVersionOptions;
        //         versionType?: GitVersionType;
        //     }
        //  * @param {boolean} includeContent - True to include the content of the page in the response for Json content type. Defaults to false (Optional)
        //  */
        let wikiApi = await this.connection.getWikiApi();
        let text = await wikiApi.getPageText(project, id, path, "None", null, true);
        return text.read().toString();
    }

    async getTeamMembersWithExtendedProperties(projectId, teamId) {
        let coreApi = await this.connection.getCoreApi();
        let data = await coreApi.getTeamMembersWithExtendedProperties(projectId, teamId);
        return data;
    }


    async getTeamIterations(projectId, projectName, teamId, teamName) {
        const teamContext = {
            project: projectName,
            projectId: projectId,
            team: teamName,
            teamId: teamId
        };
        let workApi = await this.connection.getWorkApi();
        let data = await workApi.getTeamIterations(teamContext);
        return data;
    }
    async getTeams(project) {
        let coreApi = await this.connection.getCoreApi();
        let data = await coreApi.getTeams(project);
        return data
    }
    async getBacklogs(projectId, projectName, teamId, teamName) {
        const teamContext = {
            project: projectName,
            projectId: projectId,
            team: teamName,
            teamId: teamId
        };
        let workApi = await this.connection.getWorkApi();
        let data = await workApi.getBacklogs(teamContext);
        return data;
    }
    async getBacklogLevelWorkItems(projectId, projectName, teamId, teamName, backlogId) {
        const teamContext = {
            project: projectName,
            projectId: projectId,
            team: teamName,
            teamId: teamId
        };
        let workApi = await this.connection.getWorkApi();
        let data = await workApi.getBacklogLevelWorkItems(teamContext, backlogId);
        return data;
    }
    async getWorkItems(workItemIds) {
        let workApi = await this.connection.getWorkItemTrackingApi();
        let data = await workApi.getWorkItems(workItemIds);
        return data;
    }

    async getBoards(projectId, projectName, teamId, teamName) {
        const teamContext = {
            project: projectName,
            projectId: projectId,
            team: teamName,
            teamId: teamId
        };
        let workApi = await this.connection.getWorkApi();
        let data = await workApi.getBoards(teamContext);
        return data;
    }
    async getBoard(projectId, projectName, teamId, teamName, boardId) {
        const teamContext = {
            project: projectName,
            projectId: projectId,
            team: teamName,
            teamId: teamId
        };
        let workApi = await this.connection.getWorkApi();
        let data = await workApi.getBoard(teamContext, boardId);
        return data;
    }
}
module.exports = AzureDevOpsService;