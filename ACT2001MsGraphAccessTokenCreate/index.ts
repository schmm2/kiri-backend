import { AzureFunction, Context } from "@azure/functions"

require("isomorphic-fetch");
var AuthenticationContext = require("adal-node").AuthenticationContext;

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

var AUTHORITYHOSTURL = "https://login.microsoftonline.com";
var RESOURCEURL = "https://graph.microsoft.com/";

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Get Access Token for App
function getAccessToken(url, resource, tenantId, appId, secret, logContext): Promise<any> {
    return new Promise((resolve) => {
        try {
            let authorityUrl = url + "/" + tenantId;
            logContext.log(authorityUrl)
            logContext.log(tenantId)
            logContext.log(appId)
            logContext.log(secret);

            const context = new AuthenticationContext(authorityUrl);
            context.acquireTokenWithClientCredentials(
                resource,
                appId,
                secret,
                function (err, tokenResponse: string) {
                    if (err) {
                        logContext.log(err);
                        logContext.log("wwwww");
                        resolve({ ok: false, message: JSON.stringify(err) });
                    } else {
                        resolve({ ok: true, result: tokenResponse });
                    }
                }
            );
        } catch (error) {
            let message = "error";
            logContext.log(error);
            if(error.error_description){
                message = error.error_description
            }
            resolve({ ok: false, message: message });
        }
    });
}

const ACT2001MsGraphAccessTokenCreate: AzureFunction = async function (context: Context, tenantDetails): Promise<void> {
    let response = null;
    context.log("ACT2001MsGraphAccessTokenCreate", "TenantDetails");
    context.log(tenantDetails);

    const keyVaultName = process.env["KEYVAULT_NAME"];

    if (!keyVaultName) {
        context.log("ACT2001MsGraphAccessTokenCreate", "KeyVault Name not defined");
        return response;
    }

    const KVUri = "https://" + keyVaultName + ".vault.azure.net";
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KVUri, credential);
    context.log("ACT2001MsGraphAccessTokenCreate", "KeyVault " + KVUri);

    if (tenantDetails.tenantId && tenantDetails.appId) {
        context.log("ACT2001MsGraphAccessTokenCreate", "all parameters ok");

        // Get Secret
        let retrievedSecret = null;
        try {
            retrievedSecret = await client.getSecret(tenantDetails.appId);
        }
        catch (error) {
            context.log("ACT2001MsGraphAccessTokenCreate", "Error, unable to get Secret from KeyVault")
            context.log(error)
        }

        if (retrievedSecret && retrievedSecret.value) {
            context.log("ACT2001MsGraphAccessTokenCreate", "Secret retrieved");

            let tokenResponse = await getAccessToken(
                AUTHORITYHOSTURL,
                RESOURCEURL,
                tenantDetails.tenantId,
                tenantDetails.appId,
                retrievedSecret.value,
                context
            );

            // build response object
            if (tokenResponse.ok) {
                context.log("ACT2001MsGraphAccessTokenCreate", "requested access token successfully");
                // console.log(tokenResponse);

                if (tokenResponse.result) {
                    response = {
                        status: 200,
                        body: {
                            "ok": true,
                            "accessToken": tokenResponse.result.accessToken
                        }
                    }
                }
            } else {
                context.log("ACT2001MsGraphAccessTokenCreate", "unable to request access token");
                context.log(tokenResponse);

                response = {
                    status: 400,
                    body: {
                        "ok": false,
                        "message": "unable to request access token"
                    }
                }
            }
        } else {
            context.log("ACT2001MsGraphAccessTokenCreate", "unable to get secret")
            response = {
                status: 400,
                body: {
                    "ok": false,
                    "message": "unable to get secret"
                }
            }
        }
    } else {
        context.log("ACT2001MsGraphAccessTokenCreate", "No tenant id defined")
        response = {
            status: 400,
            body: {
                "ok": false,
                "message": "missing parameters"
            }
        }
    }
    return response
};

export default ACT2001MsGraphAccessTokenCreate;