/*
 * Get Deployment from Database -> tenants and configuration ids
 * Check every tenant if the configuration already exists -> Graph API, filter name
 * Update or create the configuration according to API response
 */

import * as df from "durable-functions"

const orchestrator = df.orchestrator(function* (context) {
    let functionName = "ORC1300DeploymentRun";
    context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    // get deployment
    let deploymentId = queryParameters.deploymentId;
    let deployment = yield context.df.callActivity("ACT1050DeploymentGetById", deploymentId);
    
    if (deployment) {
        context.log(functionName, "found deployment " + deploymentId);
        
        let tenants = deployment.tenants
        let configurationIds = deployment.configurations

        for (let t = 0; t < tenants.length; t++) {
            let tenantId = tenants[t];
            context.log(functionName, "handle tenant " + tenantId);

            // Get full tenant object
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);

            // Create Job
            let jobData = {
                type: "DEPLOYMENT",
                state: "STARTED",
                tenant: tenantId
            };

            let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
            //if (!context.df.isReplaying) context.log("new job", job);

            let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

            if (accessTokenResponse && accessTokenResponse.body) {
                if (accessTokenResponse.body.ok) {
                    if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "got an accessToken");

                    for (let c = 0; c < configurationIds.length; c++) {
                        let configurationId = configurationIds[c];

                        // get configuration
                        let configuration = yield context.df.callActivity("ACT1061ConfigurationGetById", configurationId);
                        context.log(configuration);

                        // get msgraphresource url
                        let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationId);
                        //context.log(msGraphResource);

                        let filter = "displayName eq " + configuration.displayName

                        // query graph api
                        let graphQueryParameters = {
                            graphResourceUrl: msGraphResource.resource,
                            accessToken: accessTokenResponse.body.accessToken,
                            filter: filter
                        }
                        
                        let msGraphConfiguration = yield context.df.callActivity("ACT2000MsGraphQuery", graphQueryParameters);
                        context.log(msGraphConfiguration)
                    }
                }
            }
        }
    }

    return null;
});

export default orchestrator;
