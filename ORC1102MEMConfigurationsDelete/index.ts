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
const functionName = "ORC1102MEMConfigurationsDelete"

const orchestrator = df.orchestrator(function* (context) {
    // context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    let provisioningTasks = [];
    let id = 0;

    for (const tenantObject of queryParameters) {
        // get Tenant & accessToken
        let tenantId = tenantObject.tenantId
        let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);
        let accessToken = (yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant)).accessToken;
        // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);
        // if (!context.df.isReplaying) context.log(functionName, tenantObject);

        for (const configuration of tenantObject.configurations) {
            const child_id = context.df.instanceId + `:${id}`;

            const parameter = {
                accessToken: accessToken,
                tenantId: tenantId,
                configurationId: configuration
            }

            const provisionTask = context.df.callSubOrchestrator("ORC1103MEMConfigurationDelete", parameter, child_id);
            // if (!context.df.isReplaying) context.log.error(configuration);
            // if (!context.df.isReplaying) context.log(functionName, parameter);

            provisioningTasks.push(provisionTask);
            id++;
        }
    }

    if (provisioningTasks.length >= 1) {
        yield context.df.Task.all(provisioningTasks);
    }
});

export default orchestrator;
