#!/usr/bin/env node

const os = require("os");
const shell = require('shelljs');
const yargs = require("yargs");
const figlet = require('figlet');
const environment = require('dotenv').config();
const LogService = require("./services/logService");
const GitHubService = require('./services/githubService');
const AzureDevOpsService = require('./services/azureDevOpsService');

let logService = null;
let gitHubService = null;
let azureDevOpsService = null;

let azdoProject = null;
let gitHubProject = null;
let gitHubOrganizationName = null;
// TODO: get username from this.octokit.users.getAuthenticated()
let gitHubUsername = "GTRekter";

const options = yargs
  .usage("Usage: -azdoProject <string> -azdoToken <string> -azdoUrl <string> -gitHubProject <string> -gitHubToken <string> -gitHubOrganizationName <string> -verbose")
  .example("-azdoProject GTRekter -azdoToken D56jjHMXc5HSkvCFY2W3hT9SsQI1JNUb -azdoUrl 'https://contoso.visualstudio.com' -gitHubProject GTRekter -gitHubToken FY2W3hT9SsQI1JNUb gitHubOrganizationName Contoso ")
  .option("azdoProject", { alias: "azdoProject", describe: "Azure DevOps source project's name", type: "string", demandOption: true })
  .option("azdoToken", { alias: "azdoToken", describe: "Azure DevOps PAT", type: "string", demandOption: true })
  .option("azdoOrganizationUrl", { alias: "azdoOrganizationUrl", describe: "Azure DevOps source organization's URL", type: "string", demandOption: true })
  .option("gitHubProject", { alias: "gitHubProject", describe: "GitHub destination project's name", type: "string", demandOption: true })
  .option("gitHubToken", { alias: "gitHubToken", describe: "GitHub PAT", type: "string", demandOption: true })
  .option("gitHubOrganizationName", { alias: "gitHubOrganizationName", describe: "GitHub organization's name", type: "string", demandOption: true })
  .option("verbose", { alias: "verbose", describe: "Show verbose output", type: "boolean" })
  .help()
   .argv;

azdoProject = yargs.argv['azdoProject'];
gitHubProject = yargs.argv['gitHubProject'];
gitHubOrganizationName = yargs.argv['gitHubOrganizationName'];
logService = new LogService(!!yargs.argv['verbose']);

logService.general(figlet.textSync('Apodimo', { horizontalLayout: 'full' }));
logService.general("Tool designed to migrate data from Azure DevOps to GitHub");
logService.general(`Version: ${process.version}`);
logService.verbose("Generating new service instances...");
gitHubService = new GitHubService(yargs.argv['gitHubToken']);
azureDevOpsService = new AzureDevOpsService(yargs.argv['azdoToken'], yargs.argv['azdoOrganizationUrl']);
logService.info("Starting migration...");
// migrateRepositories();
// cleanProjects(); // IMPORTANT: This function delete all the projects in GitHub. To use only for testing purposes.
migrateBoards();
// migrateIterations();
// migrateWorkItems();
// migrateWiki();
// migrateTeamMembers();
// log("Migration concluded.");

process.on('unhandledRejection', error => {
    // Won't execute
    logService.error('unhandledRejection', error);
});


// Functions

function migrateRepositories() {
    logService.info(`Migrating repositories...`);
    azureDevOpsService
        .getRepos(azdoProject, true, true, false)
        .then(repos => {
            logService.verbose(`Found ${repos.length} repos in Azure DevOps project ${azdoProject}: ${repos.map(repo => repo.name)}`);
            repos.map(async repo => {
                logService.verbose(`Checking if repository ${repo.name} exists in GitHub`);
                let gitHubRepository = await gitHubService
                    .getRepositoryForOrganization(gitHubOrganizationName, repo.name)
                    .catch(error => {
                        logService.error(`Error getting repository ${repo.name} in GitHub: ${error}`);
                        return null;
                    });
                if(gitHubRepository == null) {
                    logService.verbose(`Repository ${repo.name} does not exist in GitHub. Creating...`);
                    gitHubRepository = await gitHubService
                        .createRepository(gitHubOrganizationName, repo.name)
                        .catch(error => {
                            logService.error(`Error creating repository ${repo.name} in GitHub: ${error}`);
                        });
                } else {
                    logService.verbose(`Repository ${repo.name} already exists in GitHub. Skipping...`);
                    return; 
                }
                let temporaryFolder = os.tmpdir();
                logService.verbose(`Cloning the Azure DevOps repo: ${repo.name} to the temporary folder ${temporaryFolder}/${repo.name}`);
                shell.exec(`git clone --bare ${repo.remoteUrl} ${temporaryFolder}\\${repo.name}`);
                shell.cd(`${temporaryFolder}/${repo.name}`);
                logService.verbose(`Puhsing the Azure DevOps repo: ${repo.name} to the GitHub repo: ${gitHubRepository.name}`);
                shell.exec(`git push --mirror ${gitHubRepository.clone_url}`);
                shell.cd(`..`);
                logService.verbose(`Removing the temporary folder: ${temporaryFolder}/${repo.name}`);
                shell.exec(`rm -rf ${repo.name}`);
                logService.verbose(`Migration of repository ${repo.name} completed.`);
            });
        })
        .catch(error => {
            logService.error(`Error getting repositories in Azure DevOps project ${azdoProject}: ${error}`);
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
    logService.info(`Migrating boards...`);
    azureDevOpsService
        .getRepos(azdoProject, true, true, false)
        .then(async repos => {
            logService.verbose(`Found ${repos.length} repos in Azure DevOps project ${azdoProject}: ${repos.map(repo => repo.name)}`);
            await azureDevOpsService
                .getTeams(azdoProject)
                .then(teams => {
                    logService.verbose(`Found ${teams.length} teams in Azure DevOps project ${azdoProject}`);
                    teams.map(async team => {              
                        const boards = await azureDevOpsService
                            .getBoards(team.projectId, team.projectName, team.id, team.name)
                            .catch(error => {
                                logService.error(`Error getting boards for team ${team.name}`, error);
                            });
                        logService.verbose(`Found ${boards.length} boards in Azure DevOps project ${azdoProject} and team ${team.name}`);
                        boards.map(async board => {                     
                            let boardDetails = await azureDevOpsService
                                .getBoard(team.projectId, team.projectName, team.id, team.name, board.id)
                                .catch(e => {
                                    logService.error(`Error getting boards ${board.id} from project ${team.projectName}`, e);
                                });            
                            let project = null;
                            if(repos.length > 1) {
                                logService.verbose(`Checking if project ${team.name} ${boardDetails.name} exists in the GitHub organization ${gitHubOrganizationName}`);
                                project = await gitHubService
                                    .getProjectForOrganization(gitHubOrganizationName, boardDetails.name)
                                    .catch(e => {
                                        logService.error(`Error creating project ${boardDetails.name}`, e);
                                    });
                                if(project == null) {
                                    logService.verbose(`Project ${team.name} ${boardDetails.name} does not exist in GitHub. Creating...`);
                                    project = await gitHubService
                                        .createOrgProject(gitHubOrganizationName, `${team.name} ${boardDetails.name}`)
                                        .catch(e => {
                                            logService.error(`Error creating project ${team.name} ${boardDetails.name}`, e);
                                        });
                                } else {
                                    logService.verbose(`Project ${team.name} ${boardDetails.name} already exists in GitHub. Skipping...`);
                                    return; 
                                }
                                logService.verbose(`Linking project ${team.name} ${boardDetails.name} to the GitHub repository ${gitHubProject}`);
                                // TODO: Link repositories to the project
                            } else {
                                logService.verbose(`Checking if project ${team.name} exists in the GitHub repository ${gitHubProject}`);
                                project = await gitHubService
                                    .getProject(gitHubProject, boardDetails.name)
                                    .catch(e => {
                                        logService.error(`Error getting project ${project.name}`, e);
                                    });
                                if(project == null) {
                                    logService.verbose(`Project ${team.name} does not exist in GitHub. Creating...`);
                                    project = await gitHubService
                                        .createProject(gitHubProject, `${team.name}`)
                                        .catch(e => {
                                            logService.error(`Error creating project ${team.name} ${boardDetails.name}`, e);
                                        });
                                } else {
                                    logService.verbose(`Project ${team.name} already exists in GitHub. Skipping...`);
                                    return;
                                }
                            }
                            let columns = await gitHubService
                                .getColumns(project.id)
                                .catch(e => {
                                    logService.error(`Error getting columns for project ${project.name}`, e);
                                });
                            logService.verbose(`Found ${columns.length} columns in GitHub project ${project.name}: ${columns.map(column => column.name)}`);
                            boardDetails.columns.map(async column => {
                                if(columns.find(c => c.name == column.name) == null) {
                                    logService.verbose(`Creating a new column in GitHub project ${project.name}: ${column.name}`);
                                    await gitHubService
                                        .createProjectColumn(project.id, column.name)
                                        .catch(e => {
                                            logService.error(`Error creating column ${column.name} in GitHub project ${project.name}: ${e}`);
                                        });
                                } else {
                                    logService.verbose(`Column ${column.name} already exists in GitHub project ${project.name}. Skipping...`);
                                }
                                // TODO create card to each column
                            });
                        });
                    });
                })
                .catch(e => {
                    logService.error(`Error getting teams in Azure DevOps project ${azdoProject}`, e);
                });
            }); 
}
function migrateIterations() {
    logService.info(`Migrating iterations...`);
    azureDevOpsService
        .getTeams(azdoProject)
        .then(teams => {
            teams.map(async team => {
                const iterations = await azureDevOpsService.getTeamIterations(team.projectId, team.projectName, team.id, team.name);
                iterations.map(async iteration => {
                    let milliseconds = Date.parse(iteration.attributes.finishDate);
                    let utcDateTime = new Date(milliseconds).toISOString();
                    await gitHubService.createMilestone(gitHubUsername, gitHubProject, iteration.name, "open", "", utcDateTime);
                });
            });
        });  
}
function migrateTeamMembers() { 
    logService.info(`Migrating team members...`);
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
                                await gitHubService.addCollaborator(gitHubUsername, gitHubProject, user.identity.uniqueName); 
                            }
                        });
                    });
                });
        })
}
function migrateWiki() {
    logService.info(`Migrating wiki...`);
    azureDevOpsService.getWikisByProjectName(azdoProject)
        .then(wikis => {
            wikis.map(async wiki => {
                const pages = await azureDevOpsService.getPagesByWikiId(azdoProject, wiki.id);
                pages.subPages.map(async page => {
                    const text = await azureDevOpsService.getPageTextByWikiId(azdoProject, wiki.id, page.path);
                    logService.log(text);
                    // Currently there isn't an API to create a page in the GItHub wiki
                    // make recursive call to get all subpages of subpages
                });
            });
        });  
}
function migrateWorkItems() {
    logService.info(`Migrating workitems...`);
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
function cleanProjects() {
    logService.info(`Cleaning projects...`);
    gitHubService
        .getProjectsForOrganization(gitHubOrganizationName)
        .then(async (projects) => {
            logService.verbose(`Found ${projects.length} projects in GitHub organization ${gitHubOrganizationName}`);
            projects.map(async project => {
                logService.verbose(`Deleting project ${project.id}: ${project.name}`);
                await gitHubService
                    .deleteProject(project.id)
                    .catch(e => {
                        logService.error(`Error deleting project ${project.id}: ${project.name}`, e);
                    });
            });
            logService.verbose(`Deleted all projects in GitHub organization ${gitHubOrganizationName}`);
        });
}