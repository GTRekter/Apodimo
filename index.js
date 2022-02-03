#!/usr/bin/env node

const os = require("os");
const shell = require('shelljs')
const yargs = require("yargs");
const figlet = require('figlet');
const environment = require('dotenv').config();;
const GitHubService = require('./services/githubService');
const AzureDevOpsService = require('./services/azureDevOpsService');

let gitHubService = null;
let azureDevOpsService = null;
let azdoProject = null;
let gitHubProject = null;
let verbose = null;

const options = yargs
  .usage("Usage: -azdoProject <string> -gitHubProject <string> -gitHubToken <string> -azdoToken <string> -azdoUrl <string>")
  .example("-azdoProject GTRekter -gitHubProject GTRekter -gitHubToken FY2W3hT9SsQI1JNUb -azdoToken D56jjHMXc5HSkvCFY2W3hT9SsQI1JNUb -azdoUrl 'https://contoso.visualstudio.com'")
  .option("azdoProject", { alias: "azdoProject", describe: "Azure DevOps source project's name", type: "string", demandOption: true })
  .option("azdoToken", { alias: "azdoToken", describe: "Azure DevOps PAT", type: "string", demandOption: true })
  .option("azdoOrganizationUrl", { alias: "azdoOrganizationUrl", describe: "Azure DevOps source organization's URL", type: "string", demandOption: true })
  .option("gitHubProject", { alias: "gitHubProject", describe: "GitHub destination project's name", type: "string", demandOption: true })
  .option("gitHubToken", { alias: "gitHubToken", describe: "GitHub PAT", type: "string", demandOption: true })
  .option("verbose", { alias: "verbose", describe: "Show verbose output", type: "boolean" })
  .help()
   .argv;

verbose = yargs.argv['verbose']
azdoProject = yargs.argv['azdoProject'];
gitHubProject = yargs.argv['gitHubProject'];

if(verbose) {
    console.log(figlet.textSync('Apodimo', { horizontalLayout: 'full' }));
    console.log("Tool designed to migrate data from Azure DevOps to GitHub");
}
if(verbose) {
    console.log("Generating new service instances...");
}
gitHubService = new GitHubService(yargs.argv['gitHubToken']);
azureDevOpsService = new AzureDevOpsService(yargs.argv['azdoToken'], yargs.argv['azdoOrganizationUrl']);
if(verbose) {
    console.log("Starting migration...");
}
if(verbose) {
    console.log("Migrating repositories...");
}
migrateRepositories();
if(verbose) {
    console.log("Migrating boards...");
}
migrateBoards();
    


// if(verbose) {
//     console.log("Starting migration...");
//     console.log("Migrating wiki");
// }
// migrateWiki();
// if(verbose) {
//     console.log("Migrating team members");
// }
// migrateTeamMembers();
// if(verbose) {
//     console.log("Migrating iterations");
// }
// migrateIterations();
// if(verbose) {
//     console.log("Migrating work items");
// }
// migrateWorkItems();




function log(string) {
    if(verbose) {
        console.log(string);
    }
}
function migrateRepositories() {
    azureDevOpsService
        .getRepos(azdoProject, true, true, false)
        .then(repos => {
            log("Found " + repos.length + " repos in Azure DevOps project " + azdoProject);
            repos.map(async repo => {
                let temporaryFolder = os.tmpdir();
                log(`Creating a new repo in GitHub for the Azure DevOps repo: ${repo.name}`);
                const gitHubRepository = await gitHubService.createRepository("origin-technologies", repo.name);
                log(`Cloning the Azure DevOps repo: ${repo.name} to the temporary folder ${temporaryFolder}/${repo.name}`);
                shell.exec(`git clone --bare ${repo.remoteUrl} ${temporaryFolder}\\${repo.name}`);
                shell.cd(`${temporaryFolder}/${repo.name}`);
                log(`Puhsing the Azure DevOps repo: ${repo.name} to the GitHub repo: ${gitHubRepository.name}`);
                shell.exec(`git push --mirror ${gitHubRepository.clone_url}`);
                shell.cd(`..`);
                log(`Removing the temporary folder: ${temporaryFolder}/${repo.name}`);
                shell.exec(`rm -rf ${repo.name}`);
            });
        }); 
}
function migrateBoards() {
    /*
    1. Check if there are more than one repos in the project
    YES: 
    - Create a new repo in GitHub for each repo in Azure DevOps
    - Create a new org project linked to all of the previously created repos
    NO: 
    - Create a new repo in GitHub for the project
    - Create a new repo project 
    */
    azureDevOpsService
        .getRepos(azdoProject, true, true, false)
        .then(repos => {
            log(`Found ${repos.length} repos in Azure DevOps project ${azdoProject}`);
            azureDevOpsService
                .getTeams(azdoProject)
                .then(teams => {
                    teams.map(async team => {
                        log(`Found ${teams.length} teams in Azure DevOps project ${azdoProject}`);
                        const boards = await azureDevOpsService.getBoards(team.projectId, team.projectName, team.id, team.name);
                        boards.map(async board => {
                            log(`Found ${boards.length} boards in Azure DevOps project ${azdoProject}`);
                            let boardDetails = await azureDevOpsService.getBoard(team.projectId, team.projectName, team.id, team.name, board.id);             
                            let project = null;
                            if(repos.length > 1) {
                                log(`Creating a new org project in GitHub for the Azure DevOps board: ${team.name} ${boardDetails.name}`);
                                project = await gitHubService.createOrgProject("origin-technologies", `${team.name} ${boardDetails.name}`);
                            } else {
                                log(`Creating a new repo project in GitHub for the Azure DevOps board: ${team.name} ${boardDetails.name}`);
                                project = await gitHubService.createRepoProject("GTRekter", gitHubProject, `${team.name} ${boardDetails.name}`);
                                // TODO: Link repositories to the project
                            }
                            boardDetails.columns.map(async column => {
                                await gitHubService.createProjectColumn(project.id, column.name)
                                // TODO create card to each column
                            });
                        });
                    });
                }); 
            }); 
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
