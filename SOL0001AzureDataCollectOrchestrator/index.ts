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


// models
import { ConfigurationType } from "../models/configurationtype";
import { MsGraphResource } from "../models/msgraphresource";
const createMongooseClient = require('../shared/mongodb');
const crypto = require('crypto');

const orchestrator = df.orchestrator(function* (context) {
    const outputs = [];

    // Replace "Hello" with the name of your Durable Activity Function.
    let tenantDetails = {
        tenantId: "1ea0c7b0-8b82-4500-8a55-2abb8980cd54",
        appId: "88283771-8657-46f8-b839-271ae5dd0c81"
    }
    let accessTokenResponse = (yield context.df.callActivity("TEC0001MsGraphAccessTokenCreateActivity", tenantDetails));

    if (accessTokenResponse && accessTokenResponse.body) {
        if (accessTokenResponse.body.ok) {
            //console.log(accessTokenResponse.body.accessToken);
            createMongooseClient();
            
            let msGraphResources = yield context.df.callActivity("PAT0010MsGraphResourceGet");

            const parallelGraphAPITasks = [];
            const provisioningTasks = [];

            for (let i = 0; i < msGraphResources.length; i++) {
                const child_id = context.df.instanceId+`:${i}`;
                let payload = {
                    accessToken: accessTokenResponse.body.accessToken,
                    graphResourceUrl: msGraphResources[i].resource,
                    version: msGraphResources[i].version
                }
                //parallelGraphAPITasks.push(context.df.callActivity("TEC0010MsGraphResourcesQuery", payload));
                const provisionTask = context.df.callSubOrchestrator("SOL0002AzureDataCollectSubOrchestrator", payload, child_id);
                provisioningTasks.push(provisionTask);
            }

            yield context.df.Task.all(provisioningTasks);
        }
    }
    return outputs;
});

export default orchestrator;
