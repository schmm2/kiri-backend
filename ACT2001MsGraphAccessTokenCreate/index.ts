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

function createErrorResponse(message): any {
    return {
        status: 400,
        body: {
            "ok": false,
            "message": message
        }
    }
}

// Get Access Token for App
function getAccessToken(url, resource, tenantId, appId, secret, functionContext): Promise<any> {
    return new Promise((resolve) => {
        try {
            let authorityUrl = url + "/" + tenantId;

            const context = new AuthenticationContext(authorityUrl);
            context.acquireTokenWithClientCredentials(
                resource,
                appId,
                secret,
                function (err, tokenResponse: string) {
                    if (err) {
                        resolve({ ok: false, message: JSON.stringify(err) });
                    } else {
                        resolve({ ok: true, result: tokenResponse });
                    }
                }
            );
        } catch (error) {
            let message = "undefined error";
            if (error.error_description) {
                message = error.error_description
            }
            resolve({ ok: false, message: message });
        }
    });
}

const ACT2001MsGraphAccessTokenCreate: AzureFunction = async function (context: Context, tenantDetails): Promise<void> {
    let response = null;
    // context.log("ACT2001MsGraphAccessTokenCreate", "TenantDetails");
    // context.log(tenantDetails);

    // get Keyvault name
    const keyVaultName = process.env["KEYVAULT_NAME"];

    if (!keyVaultName) {
        context.log("ACT2001MsGraphAccessTokenCreate", "KeyVault Name not defined");
        return createErrorResponse("keyvault undefined");
    } else {
        context.log("ACT2001MsGraphAccessTokenCreate", "KeyVault: " + keyVaultName);
    }

    const KVUri = "https://" + keyVaultName + ".vault.azure.net";
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KVUri, credential);
    context.log("ACT2001MsGraphAccessTokenCreate", "KeyVault " + KVUri);

    if (tenantDetails.tenantId && tenantDetails.appId) {
        context.log("ACT2001MsGraphAccessTokenCreate", "all parameters ok");
        context.log("ACT2001MsGraphAccessTokenCreate", "appId: " + tenantDetails.appId);

        // Get Secret from KeyVault
        let retrievedSecret = null;
        try {
            context.log("ACT2001MsGraphAccessTokenCreate", "get secret");
            retrievedSecret = await client.getSecret(tenantDetails.appId);
        }
        catch (error) {
            context.log("ACT2001MsGraphAccessTokenCreate", "Error, unable to get Secret from KeyVault")
            if(error.errorResponse && error.errorResponse.errorDescription ){
                context.log("ACT2001MsGraphAccessTokenCreate", error.errorResponse.errorDescription)
            }else{
                context.log(JSON.stringify(error));
            }
            return createErrorResponse("unable to get Secret from KeyVault");
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
                let message = "unable to request access token"

                if (tokenResponse.message) {
                    message += " error: " + tokenResponse.message
                }
                return createErrorResponse(message);
            }
        } else {
            context.log("ACT2001MsGraphAccessTokenCreate", "unable to get secret")
            return createErrorResponse("unable to get secret");
        }
    } else {
        context.log("ACT2001MsGraphAccessTokenCreate", "No tenant id defined")
        return createErrorResponse("parameters missing");
    }
    return response
};

export default ACT2001MsGraphAccessTokenCreate;