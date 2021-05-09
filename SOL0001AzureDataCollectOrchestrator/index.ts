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
    console.log("start SOL0001");

    const queryParameters: any = context.df.getInput();
    const outputs = [];
    let tenantDbId = null;
    
    // Get Tenant Object
    if (queryParameters) {
        tenantDbId = queryParameters.tenantDbId;
    }

    // static for testing
    tenantDbId = "608eaae218d41715c4021618";
    console.log("tenantDbId", tenantDbId);

    let tenant = yield context.df.callActivity("PAT0021TenantGetById", tenantDbId);
    console.log(tenant);
    
    console.log("--------------")

    let accessTokenResponse = yield context.df.callActivity("TEC0001MsGraphAccessTokenCreateActivity", tenant);

    if (accessTokenResponse && accessTokenResponse.body) {
        if (accessTokenResponse.body.ok) {
            //console.log(accessTokenResponse.body.accessToken);
            createMongooseClient();

            let msGraphResources = yield context.df.callActivity("PAT0010MsGraphResourceGet");

            const provisioningTasks = [];

            for (let i = 0; i < msGraphResources.length; i++) {
                const child_id = context.df.instanceId + `:${i}`;
                let payload = {
                    accessToken: accessTokenResponse.body.accessToken,
                    graphResourceUrl: msGraphResources[i].resource,
                    version: msGraphResources[i].version,
                    tenant: tenant,
                }
                const provisionTask = context.df.callSubOrchestrator("SOL0002AzureDataCollectSubOrchestrator", payload, child_id);
                provisioningTasks.push(provisionTask);
            }

            yield context.df.Task.all(provisioningTasks);
        }
    }
    return outputs;
});

export default orchestrator;
