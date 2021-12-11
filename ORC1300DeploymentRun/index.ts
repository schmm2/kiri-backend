/*
 * Get Deployment from Database -> tenants and configuration ids
 * Check every tenant if the configuration already exists -> Graph API, filter name
 * Update or create the configuration according to API response
 */

import * as df from "durable-functions"
const functionName = "ORC1300DeploymentRun";

const orchestrator = df.orchestrator(function* (context) {
    //if (!context.df.isReplaying) context.log(functionName, "start");
    const queryParameters: any = context.df.getInput();

    // get deployment
    let deploymentId = queryParameters.deploymentId;
    let deployment = yield context.df.callActivity("ACT1050DeploymentGetById", deploymentId);

    if (deployment) {
        if (!context.df.isReplaying) context.log(functionName, "found deployment " + deploymentId);

        let tenants = deployment.tenants
        let configurationIds = deployment.configurations

        for (let t = 0; t < tenants.length; t++) {
            // Get full tenant object
            let tenantId = tenants[t];
            const provisioningTasks = [];

            //if (!context.df.isReplaying) context.log(functionName, "handle tenant " + tenantId);
            
            // get tenatn & accessToken 
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);
            let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);

            // Create Job
            let jobData = {
                type: "DEPLOYMENT",
                state: "STARTED",
                tenant: tenantId,
                logs: ""
            };

            let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
            //if (!context.df.isReplaying) context.log("new job", job);
            job.log.push({ message: "start deployment for tenant " + tenant.name, state: "DEFAULT" });

            if (accessTokenResponse && accessTokenResponse.accessToken) {
                //if (!context.df.isReplaying) context.log(functionName, "got an accessToken");
                job.log.push({ message: "start deployment of " + configurationIds.length + " configurations", state: "DEFAULT" });

                let id = 0;
                for (let c = 0; c < configurationIds.length; c++) {
                    const child_id = context.df.instanceId + `:${tenantId}${id}`;
                    const newestConfigurationVersion = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", configurationIds[c]);

                    if (newestConfigurationVersion && newestConfigurationVersion._id) {
                        const parameter = {
                            accessToken: accessTokenResponse.accessToken,
                            configurationVersionDbId: newestConfigurationVersion._id,
                            tenantDbId: tenantId
                        }
                        const provisionTask = context.df.callSubOrchestrator("ORC1100MEMConfigurationUpdate", parameter, child_id);
                        provisioningTasks.push(provisionTask);
                        id++;
                    } else {
                        job.log.push({ message: "unable to find configurationId " + configurationIds[c] + "in Db", state: "ERROR" });
                    }
                }
            } else {
                job.log.push({ message: "unable to aquire access token", state: "ERROR" });
            }

            if (provisioningTasks.length >= 1) {
                yield context.df.Task.all(provisioningTasks);
            } 
            
            job.log.push({ message: "executed " + provisioningTasks.length + "tasks", state: "DEFAULT" });

            // update job
            job.state = "FINISHED"
            yield context.df.callActivity("ACT1021JobUpdate", job);
        }
    }
    return null;
});

export default orchestrator;
