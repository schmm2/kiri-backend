﻿import { AzureFunction, Context } from "@azure/functions"
import { createErrorResponse } from "../utils/createErrorResponse"

require("isomorphic-fetch");
var AuthenticationContext = require("adal-node").AuthenticationContext;

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const functionName = "ACT2001MsGraphAccessTokenCreate"
var AUTHORITYHOSTURL = "https://login.microsoftonline.com";
var RESOURCEURL = "https://graph.microsoft.com/";

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
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

const ACT2001MsGraphAccessTokenCreate: AzureFunction = async function (context: Context, tenantObject): Promise<any> {
    let response = null;
    // if (!context.df.isReplaying) context.log(functionName, "tenantObject");
    // if (!context.df.isReplaying) context.log(tenantObject);

    // get Keyvault name
    const keyVaultName = process.env["KEYVAULT_NAME"];

    if (!keyVaultName) {
        return createErrorResponse("keyvault name undefined", context, functionName);
    } else {
        context.log(functionName, "KeyVault: " + keyVaultName);
    }

    const KVUri = "https://" + keyVaultName + ".vault.azure.net";

    const credential = new DefaultAzureCredential();
    // Debug help, output JWT to see which user ha been used
    //context.log("Token:", await credential.getToken("https://graph.microsoft.com/.default"));

    const client = new SecretClient(KVUri, credential);

    context.log(functionName, "KeyVault " + KVUri);

    if (tenantObject.tenantId && tenantObject.appId) {
        context.log(functionName, "all parameters ok");
        context.log(functionName, "appId: " + tenantObject.appId);

        // ****** App Secret *****
        // Get App Secret from KeyVault
        let retrievedAppSecret = null;
        try {
            context.log(functionName, "get secret");
            retrievedAppSecret = await client.getSecret(tenantObject.appId);
        }
        catch (error) {
            context.log(functionName, "Error, unable to get Secret from KeyVault")

            if (error.errorResponse && error.errorResponse.errorDescription) {
                context.log(functionName, error.errorResponse.errorDescription)
            } else {
                context.log(functionName, error);
            }
            return createErrorResponse("unable to get Secret from KeyVault", context, functionName);
        }

        // ************

        // ****** Access Token *****
        if (retrievedAppSecret && retrievedAppSecret.value) {
            context.log(functionName, "Secret retrieved");
            let tokenResponse = null
            let storeNewToken = true

            // lookup if we already stored an accessToken
            try {
                let existingSecret = await client.getSecret("graph-" + tenantObject.tenantId);
                existingSecret = JSON.parse(existingSecret.value)

                const tokenExpiresOn = Date.parse(existingSecret.result.expiresOn);
                const dateNow = Date.now();

                //context.log(tokenExpiresOn)
                //context.log(dateNow)

                if (dateNow < tokenExpiresOn) {
                    // valid Token found
                    context.log(functionName, "stored Token still valid")
                    tokenResponse = existingSecret
                    storeNewToken = false
                } else {
                    context.log(functionName, "stored Token has expired")
                }
            }
            catch {
                context.log(functionName, "error retrieving stored secrets")
            }

            // no existing token, request a new one
            if (!tokenResponse) {
                tokenResponse = await getAccessToken(
                    AUTHORITYHOSTURL,
                    RESOURCEURL,
                    tenantObject.tenantId,
                    tenantObject.appId,
                    retrievedAppSecret.value,
                    context
                );
            }

            // build response object
            if (tokenResponse.ok) {
                context.log(functionName, "requested access token successfully");

                if (tokenResponse.result) {
                    if (storeNewToken) {
                        // store secret for later use
                        await client.setSecret("graph-" + tenantObject.tenantId, JSON.stringify(tokenResponse));
                    }
                    return {
                        "ok": true,
                        "accessToken": tokenResponse.result.accessToken
                    }
                }
            }
            else {
                let message = "unable to request access token"

                if (tokenResponse.message) {
                    message += " error: " + tokenResponse.message
                }
                return createErrorResponse(message, context, functionName);
            }
        } else {
            context.log(functionName, "unable to get secret")
            return createErrorResponse("unable to get secret", context, functionName);
        }
    } else {
        context.log(functionName, "No tenant id defined")
        return createErrorResponse("parameters missing", context, functionName);
    }
    return response
};

export default ACT2001MsGraphAccessTokenCreate;