import * as df from "durable-functions"
const functionName = "ORC1005AzureExpirationCheck"

const orchestrator = df.orchestrator(function* (context) {
    const output = [];
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

        // ********
        // Application Registrations
        // ********

        let parameterApps = {
            accessToken: accessToken,
            graphResourceUrl: '/applications'
        }

        const appResponse = yield context.df.callActivity("ACT2001MsGraphGet", parameterApps)

        if (appResponse.ok && appResponse.data) {
            const appResponseValue = appResponse.data.value

            for (let a = 0; a < appResponseValue.length; a++) {
                const app = appResponseValue[a];
                
                for (let pc = 0; pc < app.passwordCredentials.length; pc++) {
                    const passwordCredential = app.passwordCredentials[pc]

                    const expirationObject = {
                        name: app.displayName,
                        id: app.appId,
                        type: "App Registration Secret",
                        secretName: passwordCredential.displayName,
                        expirationDate: passwordCredential.endDateTime
                    }
                    output.push(expirationObject);
                }
            }
        }

        // ********
        // Apple VPP Token
        // ********
        let parameterVPP = {
            accessToken: accessToken,
            graphResourceUrl: '/deviceAppManagement/vppTokens'
        }

        let vppTokensResponse = yield context.df.callActivity("ACT2001MsGraphGet", parameterVPP)

        if (vppTokensResponse.ok && vppTokensResponse.data) {
            let vppTokensResponseValue = vppTokensResponse.data.value

            for (let vp = 0; vp < vppTokensResponseValue.length; vp++) {
                const vppToken = vppTokensResponseValue[vp];
                context.log(vppToken);

                const expirationObject = {
                    name: "Apple VPP Token",
                    state: vppToken.state,
                    id: vppToken.idd,
                    type: "Apple VPP Token",
                    secretName: vppToken.displayName,
                    expirationDate: vppToken.expirationDateTime
                }
                output.push(expirationObject);
            }
        }
        if (!context.df.isReplaying) context.log(output)
        return output;
    }
});

export default orchestrator;
