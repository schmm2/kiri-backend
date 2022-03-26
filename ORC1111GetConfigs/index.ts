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
const functionName = "ss"

const orchestrator = df.orchestrator(function* (context) {
    const output = [];
    const queryParameters: any = context.df.getInput();
    let tenantDbId = queryParameters.tenantDbId;

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);

    // context.log(accessTokenResponse)

    if (accessTokenResponse.accessToken) {
        let accessToken = accessTokenResponse.accessToken
        if (!context.df.isReplaying) context.log(functionName, "got an accessToken");

        // ********
        // Configs
        // ********

        let parameterApps = {
            accessToken: accessToken,
            graphResourceUrl: '/deviceManagement/deviceConfigurations/'
        }

        try {
            const appResponse = yield context.df.callActivity("ACT2001MsGraphGet", parameterApps)
            return appResponse
        } catch (err) {
            context.log(err)
        }
    }

    context.log(JSON.stringify(queryParameters))
    return output;
});

export default orchestrator;
