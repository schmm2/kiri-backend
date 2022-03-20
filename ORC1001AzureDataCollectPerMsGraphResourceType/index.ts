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
import { createSettingsHash } from '../utils/createSettingsHash';
let queryParameters: any;
const functionName = "ORC1001AzureDataCollectPerMsGraphResourceType"

//*******************************
// Group Policy Resolve
//*******************************

function deepResolveGroupPolicy(context, parameter, graphItem) {
    const child_id = context.df.instanceId + '2000' + `:${graphItem.id}`;

    let graphItemParameter = {
        graphId: graphItem.id,
        accessToken: parameter.accessToken
    }
    return context.df.callSubOrchestrator("ORC1002AzureDataCollectQueryGroupPolicy", graphItemParameter, child_id);
}

//*******************************
// Deep Resolve
//*******************************

function deepResolveGraphItem(context, parameter, graphItem) {
    const child_id = context.df.instanceId + '1000' + `:${graphItem.id}`;

    let graphItemParameter = { ...parameter }
    graphItemParameter.payload = graphItem

    return context.df.callSubOrchestrator("ORC1200MsGraphQueryResolveById", graphItemParameter, child_id);
}

function createSubTasksForEachItem(context, parameter, activity) {
    const tasks = [];

    for (let i = 0; i < parameter.payload.length; i++) {
        let parameterPerItem = { ...parameter }
        // replace payload with item specific payload
        parameterPerItem.payload = parameter.payload[i];
        tasks.push(context.df.callActivity(activity, parameterPerItem));
    }
    if (!context.df.isReplaying) context.log("ORC1001AzureDataCollectPerMsGraphResourceType", "started " + tasks.length + " tasks")
    return tasks;
}

const orchestrator = df.orchestrator(function* (context) {
    queryParameters = context.df.getInput();
    let msGraphResourceName = queryParameters.msGraphResourceName
    let tenant = queryParameters.tenant;
    let response = null;

    if (!context.df.isReplaying) context.log(functionName, "start");
    if (!context.df.isReplaying) context.log(functionName, "url: " + queryParameters.graphResourceUrl);

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: tenant._id
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // context.log(functionName, job);

    // Query MsGraph Resources in Tenant
    let msGraphResource = yield context.df.callActivity("ACT2001MsGraphGet", queryParameters);
    if (!context.df.isReplaying) context.log(functionName, "query ms Graph Resources");
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
        // 
        // Check if the data is already stored
        //*******************************

        let newConfigurationsFromGraph = []
        let updatedConfigurationsFromGraph = []

        // Get all newestConfigVersion from DB, query all at once => speed improv.
        let newestConfigurationVersionsInDB = yield context.df.callActivity("ACT1042ConfigurationVersionsNewestByTenant", queryParameters.tenant);

        for (let i = 0; i < msGraphResponseValue.length; i++) {
            let newGraphDataItem = msGraphResponseValue[i];

            let newestConfigurationVersionInDB = newestConfigurationVersionsInDB.find(configVersion => configVersion.graphId === newGraphDataItem.id)

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
                // New version of config found
                updatedConfigurationsFromGraph.push({
                    newestConfigurationVersionIdInDB: newestConfigurationVersionInDB._id,
                    graphValue: newGraphDataItem
                })
            } else {
                // New config found, we didnt store this config yet
                newConfigurationsFromGraph.push(newGraphDataItem)
            }
        }

        job.log.push({ message: 'Found ' + msGraphResponseValue.length + ' Configurations on Tenant to handle', state: 'DEFAULT' })
        job.log.push({ message: 'Found ' + newConfigurationsFromGraph.length + ' new Configurations', state: 'DEFAULT' })
        job.log.push({ message: 'Found ' + updatedConfigurationsFromGraph.length + ' Configurations to Update', state: 'DEFAULT' })
        yield context.df.callActivity("ACT1021JobUpdate", job);

        //*******************************
        // Deep Resolve 
        // check if ms graph resource needs further data resolved by id
        // some data returned contains empty fields (for example deviceManagementScript -> scriptContent)
        // some fields can't be queried by $expand
        // solution: take each item and query it directly again -> $resource/$itemId
        // with the response we can replace the existing but incomplete value from the previous query
        //*******************************

        if (queryParameters.objectDeepResolve) {
            // New Configs
            for (let a = 0; a < newConfigurationsFromGraph.length; a++) {
                newConfigurationsFromGraph[a] = yield deepResolveGraphItem(context, defaultParameter, newConfigurationsFromGraph[a])
            }

            // Updated Configs
            for (let b = 0; b < updatedConfigurationsFromGraph.length; b++) {
                updatedConfigurationsFromGraph[b].graphValue = yield deepResolveGraphItem(context, defaultParameter, updatedConfigurationsFromGraph[b].graphValue)
            }

            // Filter objects out if there was an issue at the resolving
            newConfigurationsFromGraph = newConfigurationsFromGraph.filter(elem => elem.id)
            updatedConfigurationsFromGraph = updatedConfigurationsFromGraph.filter(elem => elem.id)
        }

        //*******************************
        // Deep Resolve - GroupPolicy Configurations
        // Some Deep Resolve query might fail so we do no include it, try the next data collection run
        //*******************************

        if (queryParameters.graphResourceUrl === '/deviceManagement/groupPolicyConfigurations') {
            // New Configs
            for (let a = 0; a < newConfigurationsFromGraph.length; a++) {
                let newConfigDeepResolved = yield deepResolveGroupPolicy(context, defaultParameter, newConfigurationsFromGraph[a]) 
            }
            // Updated Configs
            for (let b = 0; b < updatedConfigurationsFromGraph.length; b++) {
                let updatedConfigDeepResolved = yield deepResolveGroupPolicy(context, defaultParameter, updatedConfigurationsFromGraph[b].graphValue)
            }

            // Filter objects out if there was an issue at the resolving
            newConfigurationsFromGraph = newConfigurationsFromGraph.filter(elem => elem.id)
            updatedConfigurationsFromGraph = updatedConfigurationsFromGraph.filter(elem => elem.id)
        }

        //*******************************
        // Store Data
        // Store new or changed Data in Database
        //*******************************

        // Devices
        if (queryParameters.graphResourceUrl === '/deviceManagement/managedDevices') {
            response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", defaultParameter)

        }
        // all other Configurations
        else {
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

