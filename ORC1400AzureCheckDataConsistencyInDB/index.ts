/*

 */

import * as df from "durable-functions"

const orchestrator = df.orchestrator(function* (context) {
    const queryParameters: any = context.df.getInput();
    let tenantId = queryParameters.tenantDbId;

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);
    let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);

    if (accessTokenResponse.accessToken) {
        if (accessTokenResponse.ok) {
            let configurations = yield context.df.callActivity("ACT1064ConfigurationGetByTenant", tenantId);

            const provisioningTasks = [];
            var id = 0;
            for (const configuration of configurations) {
                const child_id = context.df.instanceId + `:${id}`;

                let parameter = {
                    accessToken: accessTokenResponse.accessToken,
                    configuration: configuration
                }

                const provisionTask = context.df.callSubOrchestrator("ORC1401AzureCheckDataConsistencyInDBPerConfiguration", parameter, child_id);
                provisioningTasks.push(provisionTask);
                id++;
            }
            yield context.df.Task.all(provisioningTasks);
        }
    }

    //yield context.df.callActivity("ACT1063ConfigurationDelete", configurationId);
});

export default orchestrator;
