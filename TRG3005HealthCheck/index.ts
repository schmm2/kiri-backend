import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
import { Tenant } from "../models/tenant";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    const responseMessage = {
        backendApi: true,
        keyvault: false,
        database: false
    }

    // ***** Check Database Connection *****

    try{
        Tenant.find();
        responseMessage.database = true;
        context.log("TRG3005HealthCheck", "access db")
    } catch(e){
        context.log("TRG3005HealthCheck", "unable to access db")
    }

    // ***** Check Key-Vault *****

    // get Key-Vault name
    const keyVaultName = process.env["KEYVAULT_NAME"];

    if (keyVaultName) {
        context.log("TRG3005HealthCheck", "KeyVault: " + keyVaultName);
        const KVUri = "https://" + keyVaultName + ".vault.azure.net";

        try {
            const credential = new DefaultAzureCredential();
            const client = new SecretClient(KVUri, credential);
            // list secrects
            // catch will be triggered if looping is not possible
            for await (let secretProperties of client.listPropertiesOfSecrets()) {
                // loop through secrets if successfull
            }
            responseMessage.keyvault = true;
        }
        catch {
            context.log("TRG3005HealthCheck", "KeyVault: unable to establish a connection");
        }
    }
    else {
        context.log("TRG3005HealthCheck", "KeyVault: name not defined");
    }

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
};

export default httpTrigger;