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
import { findGraphDataTypeName } from "../utils/findGraphDataTypeName";
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
// Resolve Graph Item
//*******************************

function resolveGraphItem(context, parameter, graphItem, msGraphResource, retryOptions) {
    let adaptedParameter = { ...parameter }
    adaptedParameter.graphResourceUrl = adaptedParameter.graphResourceUrl + "/" + graphItem.id
    adaptedParameter["expandAttributes"] = msGraphResource.expandAttributes

    return context.df.callActivityWithRetry("ACT2001MsGraphGet", retryOptions, adaptedParameter);
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

    // ***** Variables *****
    // *********************

    // msGraphResource
    let msGraphResource = queryParameters.msGraphResource;
    let graphResourceUrl = msGraphResource.resource;
    let msGraphResourceName = msGraphResource.name;
    let accessToken = queryParameters.accessToken;

    // tenant
    let tenant = queryParameters.tenant;

    let response = null;

    if (!context.df.isReplaying) context.log(functionName, "start");
    if (!context.df.isReplaying) context.log(functionName, "url: " + graphResourceUrl);

    // retry options
    const firstRetryIntervalInMilliseconds = 1000;
    const maxNumberOfAttempts = 2;
    const retryOptions = new df.RetryOptions(firstRetryIntervalInMilliseconds, maxNumberOfAttempts);

    // ***** Flow *****
    // ****************

    // Create Job
    let jobData = {
        type: "GRAPH_QUERY_" + (msGraphResourceName).toUpperCase(),
        state: "STARTED",
        tenant: tenant._id
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    // context.log(functionName, job);

    // Get Datatypes for this MsGraph Resource
    let configurationDataTypes = yield context.df.callActivity("ACT1011ConfigurationTypeByMsGraphResource", msGraphResource._id);

    // Query all MsGraph Resources Items in Tenant
    let msGraphQueryAllItemsParameter = {
        accessToken: accessToken,
        graphResourceUrl: graphResourceUrl
    }
    let msGraphResponse = yield context.df.callActivity("ACT2001MsGraphGet", msGraphQueryAllItemsParameter);

    // if (!context.df.isReplaying) context.log(functionName, "query ms Graph Resources");
    // if (!context.df.isReplaying) context.log(msGraphResource);

    if (msGraphResponse && msGraphResponse.data && msGraphResponse.data.value) {
        let msGraphResponseValue = msGraphResponse.data.value
        //context.log(msGraphResponseValue);

        // build parameter for activities or orchestrator calls
        let defaultParameter = {
            graphResourceUrl: graphResourceUrl,
            tenant: tenant,
            accessToken: accessToken,
            payload: msGraphResponseValue
        }

        //*******************************
        // Resolve Graph Items
        // 
        // Deep Resolve:
        // some data returned contains empty fields (for example deviceManagementScript -> scriptContent)
        // some fields can't be queried by $expand
        // solution: take each item and query it directly again -> $resource/$itemId
        // with the response we can replace the existing but incomplete value from the previous query
        // 
        // Expand: 
        // In this process expand fields are added to the query
        //*******************************

        for (let i = 0; i < msGraphResponseValue.length; i++) {
            try {
                msGraphResponseValue[i] = yield resolveGraphItem(context, defaultParameter, msGraphResponseValue[i], msGraphResource, retryOptions)
                msGraphResponseValue[i] = msGraphResponseValue[i].data
            }
            catch (err) {
                job.log.push({ message: "unable to resolve config " + msGraphResponseValue[i].displayName, state: 'ERROR' })
                msGraphResponseValue[i] = null
            }
        }
        // Filter objects out if there was an issue at the resolving
        msGraphResponseValue = msGraphResponseValue.filter(elem => elem && elem.id)


        //*******************************
        // Send Data to Log Analytics
        // 
        // Temporary Storage 
        // Intend: Main UI Data
        //*******************************

        let logAnalyticsTasks = []


        for (let i = 0; i < msGraphResponseValue.length; i++) {
            let msGraphItem = msGraphResponseValue[i]

            // create copy so we can add some settings
            msGraphItem = JSON.parse(JSON.stringify(msGraphItem))

            // find configurationType => custom log type
            let configurationTypeName = findGraphDataTypeName(msGraphItem, graphResourceUrl)

            // find category of data
            let configurationType = configurationDataTypes.find(type => type.name == configurationTypeName)
            if (configurationType && configurationType.category) {
                msGraphItem["category"] = configurationType.category
            }

            // need to add more attributes so we can query more easily
            msGraphItem["tenantId"] = tenant.tenantId

            let logAnalyticsDataAddParameter = {
                "logType": configurationTypeName,
                "data": msGraphItem,
            }
            context.log("sssss")
            context.log(msGraphItem)

            logAnalyticsTasks.push(context.df.callActivity("ACT1200LogAnalyticsDataAdd", logAnalyticsDataAddParameter))
        }
        if (logAnalyticsTasks.length >= 1) {
            let logAnaylticsDataAddResponse = yield context.df.Task.all(logAnalyticsTasks)
            context.log(functionName, "uploaded " + logAnalyticsTasks.length + " items to Log Analytics")
        }

        //*******************************
        // Store Data in Database
        //
        // Detect which Data needs to be stored in DB
        //*******************************

        // ***** Configurations *****
        if (msGraphResource.category == "configuration") {
            // **** Version Precheck ****
            // Check if the data is already stored in Database

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
                    } // compare version value
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

                    // handle Administrative Templates, deep resolve data
                    if (graphResourceUrl === '/deviceManagement/groupPolicyConfigurations') {
                        newGraphDataItem = yield deepResolveGroupPolicy(context, defaultParameter, newGraphDataItem)
                    }

                    // New version of config found
                    updatedConfigurationsFromGraph.push({
                        newestConfigurationVersionIdInDB: newestConfigurationVersionInDB._id,
                        graphValue: newGraphDataItem
                    })
                } else {
                    // handle Administrative Templates, deep resolve data
                    if (graphResourceUrl === '/deviceManagement/groupPolicyConfigurations') {
                        newGraphDataItem = yield deepResolveGroupPolicy(context, defaultParameter, newGraphDataItem)
                    }

                    // New config found, we didnt store this config yet
                    newConfigurationsFromGraph.push(newGraphDataItem)
                }
            }

            job.log.push({ message: 'Found ' + msGraphResponseValue.length + ' Configurations on Tenant to handle', state: 'DEFAULT' })
            job.log.push({ message: 'Found ' + newConfigurationsFromGraph.length + ' new Configurations', state: 'DEFAULT' })
            job.log.push({ message: 'Found ' + updatedConfigurationsFromGraph.length + ' Configurations to Update', state: 'DEFAULT' })
            yield context.df.callActivity("ACT1021JobUpdate", job);

            // new Config
            let createConfigParameter = { ...defaultParameter }
            createConfigParameter.payload = newConfigurationsFromGraph
            createConfigParameter["msGraphResource"] = msGraphResource
            let createConfigTasks = createSubTasksForEachItem(context, createConfigParameter, "ACT3010ConfigurationCreate")

            // new Config Version
            let createConfigVersionParameter = { ...defaultParameter }
            createConfigVersionParameter.payload = updatedConfigurationsFromGraph
            createConfigVersionParameter["msGraphResource"] = msGraphResource;
            let createConfigVersionTasks = createSubTasksForEachItem(context, createConfigVersionParameter, "ACT3020ConfigurationVersionCreate")

            // merge Tasks
            let configTasks = createConfigTasks.concat(createConfigVersionTasks)

            if (configTasks.length >= 1) {
                response = yield context.df.Task.all(configTasks)
            }
        }

        // ***** Devices *****
        if (msGraphResource.category == "device") {
            response = yield context.df.callActivity("ACT3000AzureDataCollectHandleDevice", defaultParameter)
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
        job.log.push({ message: JSON.stringify(msGraphResource), state: 'ERROR' })
        job.state = 'ERROR'
    }

    yield context.df.callActivity("ACT1021JobUpdate", job);
    // if (!context.df.isReplaying) context.log(functionName, JSON.stringify(job));

    return job;
});

export default orchestrator;

