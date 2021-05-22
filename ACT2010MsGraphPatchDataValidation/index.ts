/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions"

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<string> {
    console.log("ACT2010MsGraphPatchDataValidation", "start");

    let msGraphResourceUrl = parameter.msGraphResourceUrl;
    let dataObject = parameter.dataObject;

    // modify data, otherwise it will be rejected by graph api
    // generic changes applied to all objects
    delete dataObject.version 
    delete dataObject.lastModifiedDateTime
    delete dataObject.createdDateTime
    delete dataObject.supportsScopeTags
    delete dataObject.roleScopeTagIds

    switch (msGraphResourceUrl) {
        case 'deviceEnrollmentConfiguration':
            delete dataObject.priority
            break;
        default:
            break;
    }

    return dataObject;
};

export default activityFunction;
