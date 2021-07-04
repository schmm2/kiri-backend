import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { ConfigurationType } from "../models/configurationtype";
import { MsGraphResource } from "../models/msgraphresource"; 

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    let resultStatus = 200;
    let resultMessage: any = {
        "action": "remove",
        "state": "sucess"
    };

    let objectId = (req.query.id || (req.body && req.body.id));
    context.log("TRG4010ConfigurationTypeDelete: resourceId " + objectId);

    if (objectId) {
        let configurationTypeObject = await ConfigurationType.findById(objectId);
        // context.log(configurationTypeObject);

        if (configurationTypeObject) {
            // check references 
            if (configurationTypeObject.configurations.length > 0) {
                // unable to delete
                context.log("TRG4010ConfigurationTypeDelete: unable to delete, there are configurationTypes referenced");
                resultStatus = 409;
                resultMessage = {
                    "action": "remove",
                    "state": "blocked",
                    "blockedByIds": configurationTypeObject.configurations
                };
            } else {
                // no reference, delete object    
                ConfigurationType.deleteOne({ _id:objectId }, function (err) {
                    if (err) {
                        resultStatus = 500;
                        resultMessage = {
                            "action": "remove",
                            "state": "error",
                            "message": err
                        };
                    }
                });

                // find msGraphResource and update it
                let msGraphResourceId = configurationTypeObject.msGraphResource;
                MsGraphResource.update(
                    { _id: msGraphResourceId._id },
                    { $pull: { configurationTypes: configurationTypeObject._id } },
                    (err, doc) => { if (err) { context.log("mongoose: error updating msgraphresource") } }
                )
            }
        } else {
            // object with provided id not found
            resultStatus = 400;
            resultMessage = {
                "action": "remove",
                "state": "notfound",
                "message": "object not found"
            };
            context.log("TRG4010ConfigurationTypeDelete: object not found")
        }
    } else {
        // object id not provided
        resultStatus = 400;
        resultMessage = {
            "action": "remove",
            "state": "notfound",
            "message": "parameter not provided"
        };
    }

    context.res = {
        status: resultStatus,
        body: resultMessage
    };
};

export default httpTrigger;