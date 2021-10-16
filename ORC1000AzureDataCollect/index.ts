/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your 
 *    function app in Kudu
 */

import * as df from "durable-functions"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "start");

    const outputs = [];

    // precheck parameter
    const queryParameters: any = context.df.getInput();
    let tenantMongoDbId = queryParameters.tenantMongoDbId;

    if (!tenantMongoDbId) {
        if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "Tenant Mongo DB ID not defined");
        return outputs;
    } else {
        if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "Tenant Mongo DB Id: " + tenantMongoDbId);
    }

    // Create Job
    let jobData = {
        type: "TENENAT_REFRESH",
        state: "STARTED",
        tenant: tenantMongoDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    //if (!context.df.isReplaying) context.log("new job", job);

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantMongoDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

    if (accessTokenResponse && accessTokenResponse.body) {
        if (accessTokenResponse.body.ok) {
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "got an accessToken");

            let msGraphResources = yield context.df.callActivity("ACT1000MsGraphResourceGetAll");
            // if (!context.df.isReplaying) context.log(msGraphResources);

            const provisioningTasks = [];

            for (let i = 0; i < msGraphResources.length; i++) {
                const child_id = context.df.instanceId + `:${i}`;
                let payload = {
                    accessToken: accessTokenResponse.body.accessToken,
                    graphResourceUrl: msGraphResources[i].resource,
                    msGraphResourceName: msGraphResources[i].name,
                    objectDeepResolve: msGraphResources[i].objectDeepResolve,
                    version: msGraphResources[i].version,
                    tenant: tenant,
                }
                provisioningTasks.push(context.df.callSubOrchestrator("ORC1001AzureDataCollectPerMsGraphResourceType", payload, child_id));
            }
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "started " + provisioningTasks.length + " tasks")

            // durable funtion Task.all will fail if there are no tasks in array
            if (provisioningTasks.length > 0) {
                yield context.df.Task.all(provisioningTasks);

                job.state = 'FINISHED'
            }
        } else {
            let message = "unable to aquire access token"
            if (accessTokenResponse.body.message) {
                message = accessTokenResponse.body.message
            }
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", message)
            job.state = 'ERROR';
            job.message = message;
        }
    } else {
        if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "internal error")
        job.state = 'ERROR';
        job.message = "internal error";
    }

    yield context.df.callActivity("ACT1021JobUpdate", job);
    return outputs;
});

export default orchestrator;
