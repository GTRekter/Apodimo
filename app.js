const environment = require('dotenv');
const GitHubService = require('./services/githubService');
const AzureDevOpsService = require('./services/azureDevOpsService');

async function run() {
    // migrateWiki();
    migrateWorkItems();
}

function migrateWorkItem() {
    const azdoProject = "Public";
    const gitHubProject = "Public";

    const gitHubService = new GitHubService(process.env.GITHUB_TOKEN);
    const azureDevOpsService = new AzureDevOpsService(process.env.AZURE_DEVOPS_TOKEN, process.env.AZURE_DEVOPS_URL);

    azureDevOpsService.getWikisByProjectName(azdoProject)
        .then(wikis => {
            wikis.map(async wiki => {
                const pages = await azureDevOpsService.getPagesByWikiId(azdoProject, wiki.id);
                pages.subPages.map(async page => {
                    const text = await azureDevOpsService.getPageTextByWikiId(azdoProject, wiki.id, page.path);
                    console.log(text);
                    // Currently there isn't an API to create a page in the GItHub wiki
                    // make recursive call to get all subpages of subpages
                });
            });
        });  
}

function migrateWiki() {
    const azdoProject = "Public";
    const gitHubProject = "Public";

    const gitHubService = new GitHubService(process.env.GITHUB_TOKEN);
    const azureDevOpsService = new AzureDevOpsService(process.env.AZURE_DEVOPS_TOKEN, process.env.AZURE_DEVOPS_URL);

    azureDevOpsService.getWikisByProjectName(azdoProject)
        .then(wikis => {
            wikis.map(async wiki => {
                const pages = await azureDevOpsService.getPagesByWikiId(azdoProject, wiki.id);
                pages.subPages.map(async page => {
                    const text = await azureDevOpsService.getPageTextByWikiId(azdoProject, wiki.id, page.path);
                    console.log(text);
                    // Currently there isn't an API to create a page in the GItHub wiki
                    // make recursive call to get all subpages of subpages
                });
            });
        });  
}
function migrateWorkItems() {
    const azdoProject = "Public";
    const gitHubProject = "Public";

    const gitHubService = new GitHubService(process.env.GITHUB_TOKEN);
    const azureDevOpsService = new AzureDevOpsService(process.env.AZURE_DEVOPS_TOKEN, process.env.AZURE_DEVOPS_URL);

    azureDevOpsService.getTeams(azdoProject)
        .then(teams => {
            console.log(teams);
            teams.map(async team => {
                const backlogLevels = await azureDevOpsService.getBacklogs(team.projectId, team.projectName, team.id, team.name);
                console.log(backlogLevels);
                backlogLevels.map(async backlogLevel => {
                    const backlogWorkItems = await azureDevOpsService.getBacklogLevelWorkItems(team.projectId, team.projectName, team.id, team.name, backlogLevel.id);
                    const workItemIds = backlogWorkItems.workItems.map(workItem => workItem.target.id);
                    if(workItemIds.length > 0) {
                        const workItems = await azureDevOpsService.getWorkItems(workItemIds);
                        console.log(workItems);
                        workItems.map(async workItem => {
                            const lables = [
                                workItem.fields["System.WorkItemType"],
                                workItem.fields["System.AreaPath"]
                            ]
                            const body = `<h1>${workItem.fields["System.Title"]}</h1>
                                <p>Priority: ${workItem.fields["Microsoft.VSTS.Common.Priority"]}</p>
                                <p>Effort: ${workItem.fields["Microsoft.VSTS.Common.Effort"]}</p>
                                <p>RemainingWork: ${workItem.fields["Microsoft.VSTS.Common.RemainingWork"]}</p>
                                <p>IterationPath: ${workItem.fields["System.IterationPath"]}</p>
                                <p>Reason: ${workItem.fields["System.Reason"]}</p>
                                <p>State: ${workItem.fields["System.State"]}</p>
                                <p>CreatedDate: ${workItem.fields["System.CreatedDate"]}</p>
                                <p>CreatedBy: ${workItem.fields["System.CreatedBy"]}</p>
                                <p>ChangedDate: ${workItem.fields["System.ChangedDate"]}</p>
                                <p>ChangedBy: ${workItem.fields["System.ChangedBy"]}</p>
                                <p>Description: ${workItem.fields["System.Description"]}</p>`;
                            const gitHubIssue = await gitHubService.createIssue("GTRekter", gitHubProject, workItem.fields["System.Title"], body, lables);
                            console.log(gitHubIssue);
                        });
                    }
                });

            });
        });  
}

environment.config();
run();
