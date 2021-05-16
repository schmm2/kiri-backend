import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Tenant } from '../models/tenant'
import { Configuration } from '../models/configuration';
import { ConfigurationVersion } from '../models/configurationversion';

var AdmZip = require('adm-zip');
const createMongooseClient = require('../shared/mongodb');
const zipDataType = "application/zip"
const zipFileNamePrefix = "kiri-backup-"
const zipFileNameSuffix = ".zip"
const dateNow = new Date()

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    let tenantDbId = (req.body && req.body.tenantDbId)
    tenantDbId = "608eaae218d41715c4021618";

    if (tenantDbId) {
        createMongooseClient();

        let tenantData = null;
        try {
            tenantData = await Tenant.findById(tenantDbId);
        }
        catch (error) {
            endWithBadResponse(context, "invalid tenantDbId");
        }

        if (tenantData._id) {
            // creating archive container
            var zip = new AdmZip();

            // find all configurations of this tenant
            let configurations = await Configuration.find({
                '_id': { $in: tenantData.configurations }
            });
            //console.log(configurations);

            // find newest configurationVersion
            for (let c = 0; c < configurations.length; c++) {
                let configuration = configurations[c];
                let configurationVersions = await ConfigurationVersion.find({
                    configuration: configuration._id,
                    isNewest: true
                });
                // console.log(configurationVersions);

                // add config version to zip
                if (configurationVersions.length > 0) {
                    let jsonData = configurationVersions[0].value
                    let displayName = configurationVersions[0].displayName
                    let fileName = displayName + ".json";
                    /* console.log("TRG2000ConfigurationBackupCreate, config", displayName);
                    console.log("TRG2000ConfigurationBackupCreate, content size", jsonData.length);
                    console.log("TRG2000ConfigurationBackupCreate, content", jsonData); */

                    if (jsonData.length > 0) {
                        // add file directly
                        zip.addFile(fileName, Buffer.alloc(jsonData.length, jsonData), "entry comment goes here");
                    }
                }
            }

            var zipBuffer = zip.toBuffer();
            let zipName = zipFileNamePrefix +
                (tenantData.name).toLowerCase() +
                "-" +
                formatDate(dateNow) +
                zipFileNameSuffix;

            context.res = {
                body: zipBuffer,
                headers: {
                    "Content-Disposition": "filename=" + zipName,
                    "Content-Type": "application/zip",
                    "Access-Control-Expose-Headers": "Content-Disposition"
                },
                status: 202
            };
            context.done();
        } else {
            endWithBadResponse(context, "unable to find tenant")
        }
    } else {
        endWithBadResponse(context, "invalid parameters, provide tenantDbId")
    }
};

function endWithBadResponse(context, message = "Bad Request") {
    context.log.error(message);
    context.res = {
        status: 400,
        body: message,
    };
    context.done();
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [day, month, year].join('');
}

export default httpTrigger; 