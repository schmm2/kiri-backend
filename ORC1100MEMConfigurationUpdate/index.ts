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

const orchestrator = df.orchestrator(function* (context) {
    console.log("ORC1100MsGraphConfigurationUpdate", "start");

    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let msGraphResource = queryParameters.msGraphResource;
    let msGraphResourceUrl = msGraphResource.resource;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_UPDATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // finished Job Data
    let finishedJobState = {
        _id: job._id,
        state: "FINISHED",
        message: ""
    };

    // get Tenant & AccessToken
    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
    let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);
    // console.log("ORC1100MsGraphConfigurationUpdate, accessTokenResponse", accessTokenResponse);

    // get ConfigurationVersion
    let newConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);
    // console.log("ORC1100MsGraphConfigurationUpdate, new Configuration Version", newConfigurationVersion);

    if (accessTokenResponse.body.accessToken && newConfigurationVersion) {
        console.log("ORC1100MsGraphConfigurationUpdate", "parameters ok");

        let accessToken = accessTokenResponse.body.accessToken;
        let newConfigurationVersionValue = JSON.parse(newConfigurationVersion.value);

        let dataValidationParameter = {
            msGraphResourceUrl: msGraphResourceUrl,
            dataObject: newConfigurationVersionValue
        }

        // console.log("ORC1100MsGraphConfigurationUpdate, data validation parameter", dataValidationParameter);
        let newConfigurationVersionValueValidated = yield context.df.callActivity("ACT2010MsGraphPatchDataValidation", dataValidationParameter);

        let patchParameter = {
            accessToken: accessToken,
            dataObject: newConfigurationVersionValueValidated,
            msGraphResourceUrl: msGraphResourceUrl
        }

        // console.log("ORC1100MsGraphConfigurationUpdate, patch parameter", patchParameter);
        let msGraphPatchResponse = yield context.df.callActivity("ACT2002MsGraphPatch", patchParameter);
        // console.log(msGraphPatchResponse);

        if (!msGraphPatchResponse.ok) {
            if (msGraphPatchResponse.message && msGraphPatchResponse.message.code) {
                finishedJobState.message = msGraphPatchResponse.message.code;
            }
            finishedJobState.state = 'ERROR'
        }
    } else {
        finishedJobState.message = 'Invalid Parameters';
        finishedJobState.state = 'ERROR'
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobState);
    // console.log(updatedJobResponse);
});

export default orchestrator;
