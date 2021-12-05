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
const functionName = "ORC1103MEMConfigurationDelete"

const orchestrator = df.orchestrator(function* (context) {
    context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();

    let configurationId = queryParameters.configurationId;
    let tenantId = queryParameters.tenantId;
    let accessToken = queryParameters.accessToken;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_DELETE",
        state: "STARTED",
        tenant: tenantId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
    job.log.push({ message: "job started", state: "DEFAULT" });

    // check parameters
    if (!tenantId || !configurationId || !accessToken) {
        job.log.push({ message: "invalid parameters", state: "Error" });
        job.state = 'ERROR'
    }
    else { // all parameters ok
        job.log.push({ message: "delete configuration " + configurationId, state: "DEFAULT" });
        context.log(functionName, "config delete" + configurationId)

        let configuration = yield context.df.callActivity("ACT1061ConfigurationGetById", configurationId);
        let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationId);

        // build api url
        let msGraphUrl = msGraphResource.resource + "/" + configuration.graphId;

        let paramter = {
            accessToken: accessToken,
            msGraphApiUrl: msGraphUrl
        }
        // delete in Tenant
        let deleteResponse = yield context.df.callActivity("ACT2004MsGraphDelete", paramter);
        if (!context.df.isReplaying) context.log(functionName, JSON.stringify(deleteResponse))

        if (deleteResponse.ok) {
            job.log.push({ message: "configuration " + configurationId + " deleted in tenant", state: "SUCCESS" });

            // delete in database
            let deleteInDBResponse = yield context.df.callActivity("ACT1063ConfigurationDelete", configurationId);
            if (deleteInDBResponse.ok) {
                job.log.push({ message: "configuration " + configurationId + " deleted in kiri database", state: "SUCCESS" });
            }
            job.state = "FINISHED"
        } else {
            job.log.push({ message: deleteResponse.message, state: "ERROR" });
            job.state = "ERROR"
        }
    }
    job.log.push({ message: "job finished", state: "DEFAULT" });
    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);

    return job;
});

export default orchestrator;
