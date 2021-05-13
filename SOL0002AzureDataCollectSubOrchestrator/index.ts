﻿/*
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
import { convertSchemaToGraphQL } from "graphql-compose-mongoose";

const orchestrator = df.orchestrator(function* (context) {
    let response = null;
    const queryParameters: any = context.df.getInput();
    /*console.log("query parameters - url");
    console.log(queryParameters.graphResourceUrl);*/

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (queryParameters.msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: queryParameters.tenant._id
    };
    let job = yield context.df.callActivity("PAT0022JobCreate", jobData);
    // console.log("new job", job);

    // Query Resources
    let msGraphResource = yield context.df.callActivity("TEC0010MsGraphResourcesQuery", queryParameters);
    // console.log("ms graph resource");
    // console.log(msGraphResource);

    if (msGraphResource && msGraphResource.result && msGraphResource.result.value) {
        let msGraphResponseValue = msGraphResource.result.value
        // console.log(msGraphResponseValue);
        // console.log("value ok")

        let parameter = {
            graphValue: msGraphResponseValue,
            graphResourceUrl: queryParameters.graphResourceUrl,
            tenant: queryParameters.tenant
        }

        switch (queryParameters.graphResourceUrl) {
            case '/deviceManagement/managedDevices':
                response = yield context.df.callActivity("PAT0030HandleDevice", msGraphResponseValue);
                break;
            /*case 'groupPolicyConfigurations':
                handlerResponse = await handleGroupPolicyConfigurations(graphResponseValue, tenantObject, graphResource, accessToken);
                break;*/
            default:
                response = yield context.df.callActivity("PAT0040HandleConfigurations", parameter);
                break
        }
    }
    // console.log(msGraphResource);

    // anaylze response 

    // Update Job
    let finishedJobData = {
        _id: job._id,
        state: "FINISHED",
    };
    
    let updatedJobResponse = yield context.df.callActivity("PAT0023JobUpdate", finishedJobData);
    // console.log("finished job data", finishedJobData);
    // console.log("updated job", updatedJobResponse);

    return msGraphResource;
});

export default orchestrator;

