# Introduction
Apodimo is a command line tool designed with the following goals in mind:
- Migrate work items, pipelines, and wikis from one Azure DevOps/TFS project to a GitHub project
- Real world example of how to use the REST APIs
- Cross platform support

In this project I used the following libraries:

**Azure DevOps**: 
- https://docs.microsoft.com/en-us/rest/api/azure/devops/wiki/wikis/get?view=azure-devops-rest-7.1

**GitHub:** 
- https://octokit.github.io/rest.js/v18
- https://docs.github.com/en/rest/reference/pages

# Setup
## Generate a new GitHub PAT
1. Browse and sign in to your GitHub account
2. In the upper-right corner of any page, click your profile photo, then click **Settings**.
3. Click **Developer settings**.
4. Click **Personal access tokens**.
5. Click **Generate new token**.
6. Select the **repo** scope.
7. Click **Generate token**.

## Generate a new Azure DevOps PAT
1. Browse and Sign in to your organization in Azure DevOps
2. In the upper-right corner of any page, click your profile photo, and then select **Personal access tokens**.
3. Select **+ New Token**.
4. Select the **Full Control** scope 

## Environment variables
Create a new **.env** file with the following variables:
```
GITHUB_TOKEN=PERSONAL-ACCESS-TOKEN
AZURE_DEVOPS_TOKEN=PERSONAL-ACCESS-TOKEN
AZURE_DEVOPS_URL=https://{organization}.visualstudio.com
```