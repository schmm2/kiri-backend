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
    if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate", "start");

    let response = null;
    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let msGraphResourceUrl = queryParameters.msGraphResourceUrl;
    let accessToken = queryParameters.accessToken;

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
        if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate", "parameters ok");

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
            msGraphApiUrl: msGraphResourceUrl + "/" + newConfigurationVersionValueValidated.id
        }

        // console.log("ORC1100MsGraphConfigurationUpdate, patch parameter", patchParameter);
        let msGraphPatchResponse = yield context.df.callActivity("ACT2002MsGraphPatch", patchParameter);
        response = msGraphPatchResponse;

        // console.log(msGraphPatchResponse);

        if (!msGraphPatchResponse.ok) {
            if (msGraphPatchResponse.message && msGraphPatchResponse.message.code) {
                finishedJobState.message = msGraphPatchResponse.message.code;
            }
            finishedJobState.state = 'ERROR'
        } else {
            //console.log(msGraphPatchResponse)
            //finishedJobState.message = msGraphPatchResponse

            // group policy objects need to be handled differently, need to change definitionValues too
            if (msGraphResourceUrl == "/deviceManagement/groupPolicyConfigurations" &&
                (newConfigurationVersionValue.gpoSettings && newConfigurationVersionValue.gpoSettings.length > 0)) {

                let groupPolicyUrl = "/deviceManagement/groupPolicyConfigurations/" + newConfigurationVersionValue.id + "/definitionValues";

                // first query all defined active definitonValues
                let graphQueryDefinitionValues = {
                    graphResourceUrl: groupPolicyUrl,
                    accessToken: accessToken
                }

                // query existing ids
                let definitionValuesResponse = yield context.df.callActivity("ACT2000MsGraphQuery", graphQueryDefinitionValues);

                if (definitionValuesResponse.ok) {
                    let definitonValues = definitionValuesResponse.result.value;
                    // extract all ids
                    let definitonValuesIds = definitonValues.map(definitonValue => definitonValue.id);
                    let updateDefinitionValuesUrl = "/deviceManagement/groupPolicyConfigurations/" + newConfigurationVersionValue.id + "/updateDefinitionValues"
                    
                    // delete all existing definitionValues
                    let deleteDefinitionValuesPayload = {
                        "added": [],
                        "updated": [],
                        "deletedIds": definitonValuesIds
                    }

                    let graphPostDefinitionValues = {
                        msGraphApiUrl: updateDefinitionValuesUrl,
                        accessToken: accessToken,
                        dataObject: deleteDefinitionValuesPayload
                    }
                    // delete existing ids
                    if (!context.df.isReplaying) context.log(graphPostDefinitionValues);
                    let deleteDefinitionValuesResponse = yield context.df.callActivity("ACT2003MsGraphPost", graphPostDefinitionValues);
                    if (!context.df.isReplaying) context.log(deleteDefinitionValuesResponse);

                    // add new definitionValues
                    for(let i = 0; i < newConfigurationVersionValue.gpoSettings.length; i++){
                        let gpoSetting = newConfigurationVersionValue.gpoSettings[i];

                        let newGpoDefinitionValue = {
                            msGraphApiUrl: groupPolicyUrl,
                            accessToken: accessToken,
                            dataObject: gpoSetting
                        }
                        let createDefinitionValuesResponse = yield context.df.callActivity("ACT2003MsGraphPost", newGpoDefinitionValue);
                    }  
                }
            }
        }
    } else {
        finishedJobState.message = 'Invalid Parameters';
        finishedJobState.state = 'ERROR'
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", finishedJobState);
    // console.log(updatedJobResponse);

    return response;
});

export default orchestrator;
