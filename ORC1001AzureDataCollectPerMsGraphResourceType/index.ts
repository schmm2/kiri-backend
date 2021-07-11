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
let queryParameters: any;
import { performance } from 'perf_hooks';

const orchestrator = df.orchestrator(function* (context) {
    let response = null;
    var t0 = performance.now()

    queryParameters = context.df.getInput();
    /*console.log("query parameters - url");
    console.log(queryParameters.graphResourceUrl);*/

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (queryParameters.msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: queryParameters.tenant._id
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // console.log("new job", job);

    // Update Job
    let finishedJobState = {
        _id: job._id,
        state: "FINISHED",
        message: ""
    };

    // Query Resources
    let msGraphResource = yield context.df.callActivity("ACT2000MsGraphQuery", queryParameters);
    // console.log("ms graph resource");
    // console.log(msGraphResource);  

    if (msGraphResource && msGraphResource.result && msGraphResource.result.value) {
        let msGraphResponseValue = msGraphResource.result.value
        // console.log(msGraphResponseValue);
        // console.log("value ok")

        let parameter = {
            graphValue: msGraphResponseValue,
            graphResourceUrl: queryParameters.graphResourceUrl,
            tenant: queryParameters.tenant,
            accessToken: queryParameters.accessToken
        }

        switch (queryParameters.graphResourceUrl) {
            case '/deviceManagement/managedDevices':
                response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", msGraphResponseValue);
                break;
            case '/deviceManagement/groupPolicyConfigurations':
                let groupPolicyConfiguration = yield context.df.callSubOrchestrator("ORC1002AzureDataCollectHandleGroupPolicy", parameter);
                parameter.graphValue = groupPolicyConfiguration;
                response = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", parameter);
                break;
            default:
                response = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", parameter);
                break
        }

        // analyze response, set job state accordingly
        if (response) {
            if (response.configurationTypeNotDefined && response.configurationTypeNotDefined.length > 0) {
                finishedJobState.state = 'WARNING';
                finishedJobState.message = 'ConfigurationType not yet implemented: ' + JSON.stringify(response.configurationTypeNotDefined);
            }
        }
    } else {
        finishedJobState.state = 'ERROR';
        finishedJobState.message = 'Unable to query MS Graph API';
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobState);
    // console.log("finished job data", finishedJobData);
    // console.log("updated job", updatedJobResponse);

    var t1 = performance.now()
    context.log("ORC1001AzureDataCollectPerMsGraphResourceType: finished tasks in " + (t1 - t0) + " milliseconds.")
    return msGraphResource;
});

export default orchestrator;

