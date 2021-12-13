import * as df from "durable-functions"
const functionName = "ORC1005AzureExpirationCheck"

const orchestrator = df.orchestrator(function* (context) {
    const outputs = [];
    const queryParameters: any = context.df.getInput();
    let tenantDbId = queryParameters.tenantDbId;

    // precheck parameter
    if (tenantDbId) {
        if (!context.df.isReplaying) context.log(functionName, "Tenant Mongo DB Id: " + tenantDbId);
    } else {
        //job.log.push({ message: "invalid parameter, tenant Db id not definied", state: "ERROR" });
        //job.state = "ERROR"
    }

    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
    // if (!context.df.isReplaying) context.log(tenant)

    if (accessTokenResponse.accessToken) {
        let accessToken = accessTokenResponse.accessToken
        if (!context.df.isReplaying) context.log(functionName, "got an accessToken");

        let parameter = {
            accessToken: accessToken,
            graphResourceUrl: '/deviceAppManagement/vppTokens'
        }

        let vppTokensResponse = yield context.df.callActivity("ACT2001MsGraphGet", parameter)

        if(vppTokensResponse.ok && vppTokensResponse.data){
            if (!context.df.isReplaying) context.log(vppTokensResponse.data.value)
            return vppTokensResponse.data.value;
        }
    }
});

export default orchestrator;
