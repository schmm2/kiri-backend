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
import { MsGraphResource } from "../models/msgraphresource";
let queryParameters: any;

function handleConfigurations(context, paramter) {
    // if (!context.df.isReplaying) context.log(paramter)
    // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)
    const provisioningTasks = [];

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
    queryParameters = context.df.getInput();
    let msGraphResourceName = queryParameters.msGraphResourceName
    let tenant = queryParameters.tenant;
    let response = null;

    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "start");
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "url: " + queryParameters.graphResourceUrl);

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: tenant._id
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // context.log("ORC1001AzureDataCollectPerMsGraphResourceType", job);

    // Query MsGraph Resources in Tenant
    let msGraphResource = yield context.df.callActivity("ACT2001MsGraphGet", queryParameters);
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType: query ms Graph Resources");
    // if (!context.df.isReplaying) context.log(msGraphResource);

    if (msGraphResource && msGraphResource.data && msGraphResource.data.value) {
        let msGraphResponseValue = msGraphResource.data.value
        //context.log(msGraphResponseValue);

        // build parameter for activities or orchestrator calls
        let defaultParameter = {
            graphResourceUrl: queryParameters.graphResourceUrl,
            tenant: queryParameters.tenant,
            accessToken: queryParameters.accessToken,
            graphValue: msGraphResponseValue
        }

        //*******************************
        // Handle Group Configurations
        //*******************************
        if (queryParameters.graphResourceUrl === '/deviceManagement/groupPolicyConfigurations') {
            // if (!context.df.isReplaying) context.log(paramter)
            // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)
            const provisioningTasks = [];
            let groupPolicyConfigurations;

            for (let i = 0; i < msGraphResponseValue.length; i++) {
                // if (!context.df.isReplaying) context.log("create subtask for config" + paramter.graphValue[i].displayName)
                let gpoGraphItem = msGraphResponseValue[i];

                // Precheck
                // to query administrative templates is alot of work for the system as there are many definitionValues & presentationvalues to query
                // this pre-check should speed things up
                // check DB to see if this object already exists, if modiefied dates are the same we skip this config
                let newestConfigurationVersionInDB = yield context.df.callActivity("ACT1041ConfigurationVersionNewestByGraphId", gpoGraphItem.id);

                if (newestConfigurationVersionInDB && newestConfigurationVersionInDB.graphModifiedAt) {
                    // context.log(newestConfigurationVersionInDB)
                    // compare config update date
                    if (newestConfigurationVersionInDB.graphModifiedAt === gpoGraphItem.lastModifiedDateTime) {
                        // seems to be the same config version, stop here
                        continue;
                    }
                }

                // newer version found, go done the rabbit hole
                // if (!context.df.isReplaying) context.log(gpoGraphItem)

                const child_id = context.df.instanceId + `:${i}`;
                let parameter = {
                    accessToken: queryParameters.accessToken,
                    graphId: gpoGraphItem.id
                }
                provisioningTasks.push(context.df.callSubOrchestrator("ORC1002AzureDataCollectQueryGroupPolicy", parameter, child_id));
            }

            // found some newer configs
            if (provisioningTasks.length > 0) {
                groupPolicyConfigurations = yield context.df.Task.all(provisioningTasks);

                // from here on we handle the gpo config as a normal config
                let parameter = { ...defaultParameter }
                parameter.graphValue = groupPolicyConfigurations;
                let gpoTasks = handleConfigurations(context, parameter)

                if (gpoTasks.length >= 1) {
                    response = yield context.df.Task.all(gpoTasks)
                }
            }
        }
        //*******************************
        // Handle Devices
        //*******************************
        else if (queryParameters.graphResourceUrl === '/deviceManagement/managedDevices') {
            response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", defaultParameter)
        }
        //*******************************
        // Handle other Configurations
        //*******************************
        else {
            let parameter = { ...defaultParameter };

            // check if ms graph resource needs further data resolved by id
            // some data returned contains empty fields (for example deviceManagementScript -> scriptContent)
            // some fields can't be queried by $expand
            // solution: take each item and query it directly again -> $resource/$itemId
            // with the response we replace the existing but incomplete value from the previous query
            if (queryParameters.objectDeepResolve) {
                let tasks = createSubORCTasksForEachGraphValue(context, defaultParameter, "ORC1200MsGraphQueryResolveById", "2");
                parameter.graphValue = yield context.df.Task.all(tasks);
            }

            // handle configs
            let tasksConfigurations = handleConfigurations(context, parameter)

            if (tasksConfigurations.length >= 1) {
                response = yield context.df.Task.all(tasksConfigurations)
            }
        }

        // analyze response, add to job log
        if (response && response.length > 0) {
            // add response to job log
            for (let m = 0; m < response.length; m++) {
                job.log.push({ message: response[m].message, state: response[m].state })
                // context.log(job);
            }
        }
        job.state = 'FINISHED'
    } else {
        job.log.push({ message: 'Unable to query MS Graph API', state: 'ERROR' })
        job.state = 'ERROR'
    }
    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);
    // console.log("finished job data", finishedJobData);
    // console.log("updated job", updatedJobResponse);

    return job;
});

export default orchestrator;

