const environment = require('dotenv');
const GitHubService = require('./services/githubService');
const AzureDevOpsService = require('./services/azureDevOpsService');

const azdoProject = "Public";
const gitHubProject = "Public";
let gitHubService = null;
let azureDevOpsService = null;

async function run() {
    gitHubService = new GitHubService(process.env.GITHUB_TOKEN);
    azureDevOpsService = new AzureDevOpsService(process.env.AZURE_DEVOPS_TOKEN, process.env.AZURE_DEVOPS_URL);
    // migrateWiki();

    migrateTeamMembers();
    //migrateIterations();
    //migrateWorkItems();  
}

function migrateTeamMembers() { 
    azureDevOpsService.getTeams(azdoProject)
        .then(teams => {
            //let usersToAdd = [];
            let teamUsersRequests = teams.map(async team => {
                return await azureDevOpsService.getTeamMembersWithExtendedProperties(team.projectId, team.id);
            });
            Promise.all(teamUsersRequests)
                .then(teamUsers => {
                    let usersAdded = [];
                    teamUsers.map(async users => {
                        users.map(async user => {
                            if(usersAdded.indexOf(user.identity.uniqueName) === -1) {
                                usersAdded.push(user.identity.uniqueName);
                                await gitHubService.addCollaborator("GTRekter", gitHubProject, user.identity.uniqueName); 
                            }
                        });
                    });
                });
        })
}
function migrateWiki() {
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
function migrateIterations() {
    azureDevOpsService.getTeams(azdoProject)
        .then(teams => {
            teams.map(async team => {
                const iterations = await azureDevOpsService.getTeamIterations(team.projectId, team.projectName, team.id, team.name);
                iterations.map(async iteration => {
                    let milliseconds = Date.parse(iteration.attributes.finishDate);
                    let utcDateTime = new Date(milliseconds).toISOString();
                    await gitHubService.createMilestone("GTRekter", gitHubProject, iteration.name, "open", "", utcDateTime);
                });
            });
        });  
}
function migrateWorkItems() {
    azureDevOpsService.getTeams(azdoProject)
        .then(teams => {
            teams.map(async team => {
                const iterations = await azureDevOpsService.getTeamIterations(team.projectId, team.projectName, team.id, team.name);
                const backlogLevels = await azureDevOpsService.getBacklogs(team.projectId, team.projectName, team.id, team.name);
                backlogLevels.map(async backlogLevel => {
                    const backlogWorkItems = await azureDevOpsService.getBacklogLevelWorkItems(team.projectId, team.projectName, team.id, team.name, backlogLevel.id);
                    const workItemIds = backlogWorkItems.workItems.map(workItem => workItem.target.id);
                    if(workItemIds.length > 0) {
                        const workItems = await azureDevOpsService.getWorkItems(workItemIds);
                        workItems.map(async workItem => {
                            const labels = [
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
                            const iteration = iterations.filter(i => i.path === workItem.fields["System.IterationPath"]);
                            let milestone = null;
                            if(iteration.length > 0) {
                                milestone = iteration[0].name;
                            }
                            await gitHubService.createIssue("GTRekter", gitHubProject, workItem.fields["System.Title"], body, milestone, labels);
                        });
                    }
                });
            });
        });  
}

environment.config();
run();
