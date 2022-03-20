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
    job.log.push({ message: "started job at " + (new Date(Date.now())).toISOString(), state: "DEFAULT" });

    //if (!context.df.isReplaying) context.log("new job", job);

    // precheck parameter
    if (tenantDbId) {
        if (!context.df.isReplaying) context.log(functionName, "Tenant Mongo DB Id: " + tenantDbId);
    } else {
        job.log.push({ message: "invalid parameter, tenant Db id not definied", state: "ERROR" });
        job.state = "ERROR"
    }

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);

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
                    deepResolveAttributes: msGraphResources[i].deepResolveAttributes,
                    tenant: tenant,
                }
                provisioningTasks.push(context.df.callSubOrchestrator("ORC1001AzureDataCollectPerMsGraphResourceType", payload, child_id));
            }
            if (!context.df.isReplaying) context.log("ORC1000AzureDataCollect", "started " + provisioningTasks.length + " tasks")

            // set job state
            job.log.push({ message: "started " + provisioningTasks.length + " tasks", state: "SUCCESS" });

            // durable funtion Task.all will fail if there are no tasks in array
            if (provisioningTasks.length > 0) {
                yield context.df.Task.all(provisioningTasks);
            }
            // set job state
            job.log.push({ message: provisioningTasks.length + " tasks done", state: "SUCCESS" });
            job.state = 'FINISHED'
        } else {
            let message = "unable to aquire access token"
            if (accessTokenResponse.message) {
                message = accessTokenResponse.message
            }
            job.state = 'ERROR';
            job.log.push({ message: message, state: "ERROR" });
        }
    } else {
        job.state = 'ERROR';
        job.log.push({ message: "internal error, unable to create accessToken", state: "ERROR" });
    }

    job.log.push({ message: "job finished at " + (new Date(Date.now())).toISOString(), state: "DEFAULT" });
    yield context.df.callActivity("ACT1021JobUpdate", job);

    if (job.state == "ERROR") {
        return createErrorResponse(job.message, context, functionName);
    } else {
        return job
    }
});

export default orchestrator;
