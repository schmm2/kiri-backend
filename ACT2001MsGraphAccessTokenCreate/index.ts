﻿import { AzureFunction, Context, HttpRequest } from "@azure/functions"
require("isomorphic-fetch");
var adal = require("adal-node");
var AuthenticationContext = require("adal-node").AuthenticationContext;

const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

var AUTHORITYHOSTURL = "https://login.microsoftonline.com";
var RESOURCEURL = "https://graph.microsoft.com/";

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
} 

const keyVaultName = process.env["KEY_VAULT_NAME"];
const KVUri = "https://" + keyVaultName + ".vault.azure.net";

const credential = new DefaultAzureCredential();
const client = new SecretClient(KVUri, credential);

// Get Access Token for App
function getAccessToken(url, resource, tenantId, appId, secret): Promise<any> {
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
            resolve({ ok: false, message: error });
        }
    });
}

const ACT2001MsGraphAccessTokenCreate: AzureFunction = async function (context: Context, tenantDetails): Promise<void> {
    context.log("ACT2001MsGraphAccessTokenCreate: TenantDetais");
    context.log(tenantDetails);
    context.log("ACT2001MsGraphAccessTokenCreate: KeyVault " + KVUri);

    let response = null;
    // console.log(payload);

    if (tenantDetails.tenantId && tenantDetails.appId) {
        // Get Secret
        let retrievedSecret = null;
        try {
            retrievedSecret = await client.getSecret(tenantDetails.appId);
        }
        catch (error) {
            context.log(error);
        }

        if (retrievedSecret && retrievedSecret.value) {
            context.log("all parameters ok");

            let tokenResponse = await getAccessToken(
                AUTHORITYHOSTURL,
                RESOURCEURL,
                tenantDetails.tenantId,
                tenantDetails.appId,
                retrievedSecret.value
            );

            // build response object
            if (tokenResponse.ok) {
                console.log("requested access token successfully");
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
                context.log("unable to request access token");
                // console.log(tokenResponse);

                response = {
                    status: 400,
                    body: {
                        "ok": false,
                        "message": "unable to request access token"
                    }
                }
            }
        } else {
            context.log("unable to get secret")
            response = {
                status: 400,
                body: {
                    "ok": false,
                    "message": "unable to get secret"
                }
            }
        }
    } else {
        context.log("No tenant id defined")
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