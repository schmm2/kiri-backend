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
const createMongooseClient = require('../shared/mongodb');

const orchestrator = df.orchestrator(function* (context) {
    console.log("start ORC1000AzureDataCollect");

    const queryParameters: any = context.df.getInput();
    const outputs = [];
    let tenantDbId = queryParameters.tenantDbId;

    // Create Job
    let jobData = {
        type: "TENENAT_REFRESH",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // console.log("new job", job);

    // Get Tenant Object
    if (queryParameters) {
        tenantDbId = tenantDbId;
        // console.log("tenantDbId", tenantDbId);
    }
    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    // console.log(tenant);

    let accessTokenResponse = yield context.df.callActivity("ACT2001GraphAccessTokenCreate", tenant);

    if (accessTokenResponse && accessTokenResponse.body) {
        if (accessTokenResponse.body.ok) {
            //console.log(accessTokenResponse.body.accessToken);
            createMongooseClient();

            let msGraphResources = yield context.df.callActivity("ACT1000MsGraphResourceGetAll");

            const provisioningTasks = [];

            for (let i = 0; i < msGraphResources.length; i++) {
                const child_id = context.df.instanceId + `:${i}`;
                let payload = {
                    accessToken: accessTokenResponse.body.accessToken,
                    graphResourceUrl: msGraphResources[i].resource,
                    msGraphResourceName: msGraphResources[i].name,
                    version: msGraphResources[i].version,
                    tenant: tenant,
                }
                const provisionTask = context.df.callSubOrchestrator("ORC1001AzureDataCollectPerMsGraphResourceType", payload, child_id);
                provisioningTasks.push(provisionTask);
            }

            yield context.df.Task.all(provisioningTasks);
        }
    }

    // Update Job
    let finishedJobData = {
        _id: job._id,
        state: "FINISHED",
    };
    // console.log("finished job data", finishedJobData);
    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobData);
    // console.log("updated job", updatedJobResponse);

    return outputs;
});

export default orchestrator;
