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
let queryParameters: any;

function handleGroupPolicyConfigurations(context, paramter) {
    const provisioningTasks = [];
    // context.log("Instance ID:", context.df.instanceId)

    for (let i = 0; i < paramter.graphValue.length; i++) {
        const child_id = context.df.instanceId + `:${i}`;
        let payload = { ...paramter }
        payload.graphValue = paramter.graphValue[i];
        // context.log("ORC1001AzureDataCollectPerMsGraphResourceType",  "start group policy handler " + i + " for " + paramter.graphValue[i].displayName)
        provisioningTasks.push(context.df.callSubOrchestrator("ORC1002AzureDataCollectHandleGroupPolicy", payload, child_id));
    }
    context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "started " + provisioningTasks.length + " tasks")
    return provisioningTasks;
}

const orchestrator = df.orchestrator(function* (context) {
    context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "start");

    let response = null;
    queryParameters = context.df.getInput();
    context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "url: " + queryParameters.graphResourceUrl);

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
    context.log("ORC1001AzureDataCollectPerMsGraphResourceType: query ms Graph Resources");

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
                // call gpo handler
                let tasks = handleGroupPolicyConfigurations(context, parameter);
                let groupPolicyConfiguration = yield context.df.Task.all(tasks);
                context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "query group policy configurations completed");
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

    return msGraphResource;
});

export default orchestrator;

