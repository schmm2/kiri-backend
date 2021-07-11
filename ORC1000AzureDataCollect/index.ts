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

    const outputs = [];

    // precheck parameter
    const queryParameters: any = context.df.getInput();
    let tenantMongoDbId = queryParameters.tenantMongoDbId;
    if(!tenantMongoDbId){
        return outputs;
    }

    // Create Job
    let jobData = {
        type: "TENENAT_REFRESH",
        state: "STARTED",
        tenant: tenantMongoDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // console.log("new job", job);

    // Job, finished State
    let finishedJobState = {
        _id: job._id,
        state: "FINISHED",
        message: ""
    };

    // Get Tenant Object
    if (queryParameters) {
        tenantMongoDbId = tenantMongoDbId;
        // console.log("tenantMongoDbId", tenantMongoDbId);
    }
    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantMongoDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

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
            context.log("ORC1000AzureDataCollect: started " + provisioningTasks.length + " tasks")
            yield context.df.Task.all(provisioningTasks);
        }
    } else {
        finishedJobState.state = 'ERROR';
        finishedJobState.message = 'Unable to aquire access token';
    }


    // console.log("finished job data", finishedJobData);
    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobState);
    // console.log("updated job", updatedJobResponse);

    return outputs;
});

export default orchestrator;
