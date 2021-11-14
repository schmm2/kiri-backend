/*
 * Functionality:
 *  
 */

import * as df from "durable-functions"
import { createErrorResponse } from "../utils/createErrorResponse";
const functionName = "ORC1000AzureDataCollect"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    let tenantDbId = queryParameters.tenantDbId;

    // Create Job
    let jobData = {
        type: "TENENAT_REFRESH",
        state: "STARTED",
        tenant: tenantDbId
    };

    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    //if (!context.df.isReplaying) context.log("new job", job);

    // precheck parameter
    if (tenantDbId) {
        if (!context.df.isReplaying) context.log(functionName, "Tenant Mongo DB Id: " + tenantDbId);
    } else {
        job.message = "invalid parameter, tenant Db id not definied";
        job.state = "ERROR"
    }

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

    if (accessTokenResponse.accessToken) {
        if (accessTokenResponse.ok) {
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "got an accessToken");

            let msGraphResources = yield context.df.callActivity("ACT1000MsGraphResourceGetAll");
            // if (!context.df.isReplaying) context.log(msGraphResources);

            const provisioningTasks = [];

            for (let i = 0; i < msGraphResources.length; i++) {
                const child_id = context.df.instanceId + `:${i}`;
                let payload = {
                    accessToken: accessTokenResponse.accessToken,
                    graphResourceUrl: msGraphResources[i].resource,
                    msGraphResourceName: msGraphResources[i].name,
                    objectDeepResolve: msGraphResources[i].objectDeepResolve,
                    apiVersion: msGraphResources[i].version,
                    tenant: tenant,
                }
                provisioningTasks.push(context.df.callSubOrchestrator("ORC1001AzureDataCollectPerMsGraphResourceType", payload, child_id));
            }
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "started " + provisioningTasks.length + " tasks")
            job.log += "started " +  provisioningTasks.length + " tasks"

            // durable funtion Task.all will fail if there are no tasks in array
            if (provisioningTasks.length > 0) {
                yield context.df.Task.all(provisioningTasks);
            }
            // set job state
            job.state = 'FINISHED'
        } else {
            let message = "unable to aquire access token"
            if (accessTokenResponse.message) {
                message = accessTokenResponse.message
            }
            job.state = 'ERROR';
            job.message = message;
        }
    } else {
        job.state = 'ERROR';
        job.message = "internal error";
    }

    yield context.df.callActivity("ACT1021JobUpdate", job);

    if(job.state == "ERROR"){
        return createErrorResponse(job.message, context, functionName);
    }else{
        return job
    }
});

export default orchestrator;
