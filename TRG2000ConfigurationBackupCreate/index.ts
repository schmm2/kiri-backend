import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Tenant } from '../models/tenant'
import { Configuration } from '../models/configuration';
import { ConfigurationVersion } from '../models/configurationversion';
import { ConfigurationType, ConfigurationTypeTC } from '../models/configurationtype';

const AdmZip = require('adm-zip');
const createMongooseClient = require('../shared/mongodb');
const zipFileNamePrefix = "kiri-backup-"
const zipFileNameSuffix = ".zip"
const dateNow = new Date()


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    // console.log("TRG2000ConfigurationBackupCreate", "start");
    let tenantDbId = (req.body && req.body.tenantDbId)
    
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

            for (let c = 0; c < configurations.length; c++) {
                // find newest configurationVersion
                let configuration = configurations[c];
                let configurationVersions = await ConfigurationVersion.find({
                    configuration: configuration._id,
                    isNewest: true
                });
                // console.log(configurationVersions);

                // add config version to zip
                if (configurationVersions.length > 0) {
                    // find config type
                    let configurationType = await ConfigurationType.findById(configuration.configurationType);

                    if (configurationType.name) {
                        // define folderPath
                        let folderPath = configurationType.name + "/"

                        // prepare configurationData
                        let jsonData = configurationVersions[0].value
                        let displayName = configurationVersions[0].displayName
                        let fileName = displayName + ".json"
                        let filePath = folderPath + fileName

                        /* console.log("TRG2000ConfigurationBackupCreate, config", displayName);
                        console.log("TRG2000ConfigurationBackupCreate, content size", jsonData.length);
                        console.log("TRG2000ConfigurationBackupCreate, content", jsonData); 
                        console.log("TRG2000ConfigurationBackupCreate, filepath ", filePath);*/

                        if (jsonData.length > 0) {
                            // add file directly
                            zip.addFile(filePath, Buffer.alloc(jsonData.length, jsonData), '');
                        }
                    }
                }
            }

            let zipBuffer = zip.toBuffer();
            let zipName = zipFileNamePrefix +
                (tenantData.name).toLowerCase() +
                "-" +
                formatDate(dateNow) +
                zipFileNameSuffix;
            
            endWithResponse(context,zipBuffer, zipName);
        } else {
            endWithBadResponse(context, "unable to find tenant")
        }
    } else {
        endWithBadResponse(context, "invalid parameters, provide tenantDbId")
    }
};

function endWithResponse(context, zipBuffer, zipName){
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
}

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