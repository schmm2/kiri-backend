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
    if (!context.df.isReplaying) context.log("ccccccccccccc")
    if (!context.df.isReplaying) context.log(paramter)
    const provisioningTasks = [];
    // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)

    for (let i = 0; i < paramter.graphValue.length; i++) {
        // if (!context.df.isReplaying) context.log("aaaaaaaaaaaaaa create subtask for config" + paramter.graphValue[i].displayName)
        const child_id = context.df.instanceId + `:${i}`;
        let payload = { ...paramter }
        payload.graphValue = paramter.graphValue[i];
        provisioningTasks.push(context.df.callSubOrchestrator("ORC1002AzureDataCollectHandleGroupPolicy", payload, child_id));
    }
    return provisioningTasks;
}

function handleConfigurations(context, paramter) {
    //context.log(paramter)
    const provisioningTasks = [];
    // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)

    for (let i = 0; i < paramter.graphValue.length; i++) {
        let payload = { ...paramter }
        payload.graphValue = paramter.graphValue[i];
        provisioningTasks.push(context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", payload));
    }
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "started " + provisioningTasks.length + " tasks")
    return provisioningTasks;
}

function createSubORCTasksForEachGraphValue(context, paramter, subOrchestrator, idOffset) {
    const provisioningTasks = [];
    // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)

    for (let i = 0; i < paramter.graphValue.length; i++) {
        const child_id = context.df.instanceId + idOffset + `:${i}`;
        let payload = { ...paramter }
        payload.graphValue = paramter.graphValue[i];
        provisioningTasks.push(context.df.callSubOrchestrator(subOrchestrator, payload, child_id));
    }
    return provisioningTasks;
}

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "start");

    let response = null;
    queryParameters = context.df.getInput();
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "url: " + queryParameters.graphResourceUrl);

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (queryParameters.msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: queryParameters.tenant._id
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // context.log("ORC1001AzureDataCollectPerMsGraphResourceType", job);

    // Query MsGraph Resources in Tenant
    let msGraphResource = yield context.df.callActivity("ACT2000MsGraphQuery", queryParameters);
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType: query ms Graph Resources");

    if (msGraphResource && msGraphResource.result && msGraphResource.result.value) {
        let msGraphResponseValue = msGraphResource.result.value
        //context.log(msGraphResponseValue);

        // build parameter for activities or orchestrator calls
        let parameter = {
            graphResourceUrl: queryParameters.graphResourceUrl,
            tenant: queryParameters.tenant,
            accessToken: queryParameters.accessToken,
            graphValue: msGraphResponseValue
        }

        // check if ms graph resource needs further data resolved by id
        // some data returned contains empty fields (for example deviceManagementScript -> scriptContent)
        // some fields can't be queried by $expand
        // solution: take each item and query it directly again -> $resource/$itemId
        // with the response we replace the existing but incomplete value from the previous query
        if (queryParameters.objectDeepResolve) {
            let tasks = createSubORCTasksForEachGraphValue(context, parameter, "ORC1200MsGraphQueryResolveById", "1");
            parameter.graphValue = yield context.df.Task.all(tasks);
        }

        switch (queryParameters.graphResourceUrl) {
            case '/deviceManagement/managedDevices':
                response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", parameter)
                break
            case '/deviceManagement/groupPolicyConfigurations':
                // call gpo handler
                // only return objects which need updating/creating in db
                let tasks = handleGroupPolicyConfigurations(context, parameter)
                let groupPolicyConfiguration = yield context.df.Task.all(tasks)
                // filter empty objects
                groupPolicyConfiguration = groupPolicyConfiguration.filter(n => n);

                // handle the gpo objects as normal configurations from this point on
                if (groupPolicyConfiguration.length > 0) {
                    parameter.graphValue = groupPolicyConfiguration
                    let gpoTasks = handleConfigurations(context, parameter)
                    response = yield context.df.Task.all(gpoTasks)
                }
                break
            default:
                let tasksConfigurations = handleConfigurations(context, parameter)
                response = yield context.df.Task.all(tasksConfigurations)
                //response = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", parameter);
                break
        }

        // analyze response, set job state accordingly
        if (response && response.length > 0) {
            // add response to job log
            for (let m = 0; m < response.length; m++) {
                job.log += response[m].message
            }
        }
        // finish job state
        job.message = 'Done'
        job.state = 'FINISHED'
    } else {
        job.state = 'ERROR';
        job.message = 'Unable to query MS Graph API';
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);
    // console.log("finished job data", finishedJobData);
    // console.log("updated job", updatedJobResponse);

    return job;
});

export default orchestrator;

