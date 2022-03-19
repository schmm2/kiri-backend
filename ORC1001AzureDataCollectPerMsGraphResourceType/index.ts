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
import { createSettingsHash } from '../utils/createSettingsHash';
let queryParameters: any;
const functionName = "ORC1001AzureDataCollectPerMsGraphResourceType"

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

function createSubTasksForEachItem(context, paramter, activity) {
    const tasks = [];

    for (let i = 0; i < paramter.payload.length; i++) {
        let parameterPerItem = { ...paramter }
        // replace payload with item specific payload
        parameterPerItem.payload = paramter.payload[i];
        tasks.push(context.df.callActivity(activity, parameterPerItem));
    }
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "started " + tasks.length + " tasks")
    return tasks;
}


function createSubORCTasksForEachItem(context, paramter, subOrchestrator, idOffset) {
    const provisioningTasks = [];
    // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)

    for (let i = 0; i < paramter.payload.length; i++) {
        const child_id = context.df.instanceId + idOffset + `:${i}`;
        let parameterPerItem = { ...paramter }
        parameterPerItem.payload = paramter.payload[i];
        provisioningTasks.push(context.df.callSubOrchestrator(subOrchestrator, parameterPerItem, child_id));
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
            payload: msGraphResponseValue
        }

        //*******************************
        // Version Precheck
        // Is the data already stored?
        //*******************************

        const newConfigurationsFromGraph = []
        const updatedConfigurationsFromGraph = []

        for (let i = 0; i < msGraphResponseValue.length; i++) {
            let newGraphDataItem = msGraphResponseValue[i];

            // check DB to see if this object already exists
            let newestConfigurationVersionInDB = yield context.df.callActivity("ACT1041ConfigurationVersionNewestByGraphId", newGraphDataItem.id);

            if (newestConfigurationVersionInDB && newestConfigurationVersionInDB._id) {
                // Graph Item Id does already exists in our DB, but its unclear if it is the newest version
                // Check lastModifiedDate > version > versionHash
                // context.log(newestConfigurationVersionInDB)

                // compare config last modified date
                if (newGraphDataItem.lastModifiedDateTime && (newestConfigurationVersionInDB.graphModifiedAt === newGraphDataItem.lastModifiedDateTime)) {
                    continue;
                }
                else if (newGraphDataItem.version && (newestConfigurationVersionInDB.graphVersion === newGraphDataItem.version)) {
                    continue;
                }
                else {
                    // graph item does not have the attribut lastModifiedDateTime or version => Version check by hash
                    let newGraphDataItemVersionHash = createSettingsHash(newGraphDataItem)
                    if (newGraphDataItemVersionHash === newestConfigurationVersionInDB.version) {
                        continue
                    }
                }
                // new version of config found
                updatedConfigurationsFromGraph.push({
                    newestConfigurationVersionIdInDB: newestConfigurationVersionInDB._id,
                    graphValue: newGraphDataItem
                })
            } else {
                // we didnt store this config yet
                newConfigurationsFromGraph.push(newGraphDataItem)
            }
        }

        job.log.push({ message: 'Found ' + msGraphResponseValue.length + ' Configurations on Tenant to handle', state: 'DEFAULT' })
        job.log.push({ message: 'Found ' + newConfigurationsFromGraph.length + ' new Configurations', state: 'DEFAULT' })
        job.log.push({ message: 'Found ' + updatedConfigurationsFromGraph.length + ' Configurations to Update', state: 'DEFAULT' })
        yield context.df.callActivity("ACT1021JobUpdate", job);

        //*******************************
        // Handle GroupPolicy Configurations
        //*******************************

        if (queryParameters.graphResourceUrl === '/deviceManagement/groupPolicyConfigurations') {
            // if (!context.df.isReplaying) context.log(paramter)
            // if (!context.df.isReplaying) context.log("Instance ID:", context.df.instanceId)

            /*
            const provisioningTasks = [];
            let groupPolicyConfigurations;

            for (let i = 0; i < newConfigurationsFromGraph.length; i++) {
                // if (!context.df.isReplaying) context.log(newConfigurationsFromGraph[i])

                const child_id = context.df.instanceId + `:${i}`;
                let parameter = {
                    accessToken: queryParameters.accessToken,
                    graphId: newConfigurationsFromGraph[i].id
                }
                //go done the rabbit hole
                provisioningTasks.push(context.df.callSubOrchestrator("ORC1002AzureDataCollectQueryGroupPolicy", parameter, child_id));
            }

            // found some newer configs
            if (provisioningTasks.length > 0) {
                groupPolicyConfigurations = yield context.df.Task.all(provisioningTasks);

                // from here on we handle the gpo config as a normal config
                let parameter = { ...defaultParameter }
                parameter.payload = groupPolicyConfigurations;
                let gpoTasks = handleConfigurations(context, parameter)

                if (gpoTasks.length >= 1) {
                    response = yield context.df.Task.all(gpoTasks)
                }
            }*/
        }
        //*******************************
        // Handle Devices
        //*******************************
        else if (queryParameters.graphResourceUrl === '/deviceManagement/managedDevices') {
            //response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", defaultParameter)
        }
        //*******************************
        // Handle other Configurations
        //*******************************
        else {
            // check if ms graph resource needs further data resolved by id
            // some data returned contains empty fields (for example deviceManagementScript -> scriptContent)
            // some fields can't be queried by $expand
            // solution: take each item and query it directly again -> $resource/$itemId
            // with the response we replace the existing but incomplete value from the previous query
            //if (queryParameters.objectDeepResolve) {
            //    let tasks = createSubORCTasksForEachGraphValue(context, defaultParameter, "ORC1200MsGraphQueryResolveById", "2");
            //    parameter.graphValue = yield context.df.Task.all(tasks);
            //}

            // handle configs
            // new Config
            let createConfigParameter = { ...defaultParameter }
            createConfigParameter.payload = newConfigurationsFromGraph
            let createConfigTasks = createSubTasksForEachItem(context, createConfigParameter, "ACT3010ConfigurationCreate")

            // new Config Version
            let createConfigVersionParameter = { ...defaultParameter }
            createConfigVersionParameter.payload = updatedConfigurationsFromGraph

            let createConfigVersionTasks = createSubTasksForEachItem(context, createConfigVersionParameter, "ACT3020ConfigurationVersionCreate")

            // merge Tasks
            let configTasks = createConfigTasks.concat(createConfigVersionTasks)

            if (configTasks.length >= 1) {
                response = yield context.df.Task.all(configTasks)
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

    yield context.df.callActivity("ACT1021JobUpdate", job);
    // if (!context.df.isReplaying) context.log(functionName, JSON.stringify(job));

    return job;
});

export default orchestrator;

