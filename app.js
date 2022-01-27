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
                    }
                });

            });
        });  
}

environment.config();
run();
