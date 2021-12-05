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
    context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    

    var id = 0;
    for (const tenantObject of queryParameters) { 
        let provisioningTasks = [];

        // get Tenant
        let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantObject.tenantId);

        // get accessToken
        let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
        // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);

        for (const configuration of tenantObject.configurations) {
            const child_id = context.df.instanceId + `:${id}`;
            
            //context.log.error(configuration);
            let parameter = {
                accessToken: accessTokenResponse.accessToken,
                tenantId: tenantObject.tenantId,
                configurationId: configuration
            }

            const provisionTask = context.df.callSubOrchestrator("ORC1103MEMConfigurationDelete", parameter, child_id);
            provisioningTasks.push(provisionTask);
            id++;
        }
        yield context.df.Task.all(provisioningTasks);
    }
});

export default orchestrator;
