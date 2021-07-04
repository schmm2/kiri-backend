import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const { MsGraphResource } = require('../models/msgraphresource');

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    let resultStatus = 200;
    let resultMessage: any = {
        "action": "remove",
        "state": "sucess",
    }

    let objectId = (req.query.id || (req.body && req.body.id));
    context.log("TRG4000MsGraphResourceDelete: resourceId " + objectId);

    if (objectId) {
        let msGraphResourceObject = await MsGraphResource.findById(objectId);
        // context.log(msGraphResourceObject);

        if (msGraphResourceObject) {
            // check references 
            if (msGraphResourceObject.configurationTypes.length > 0) {
                // unable to delete
                context.log("TRG4000MsGraphResourceDelete: unable to delete, there are configurationTypes referenced");
                resultStatus = 409;
                resultMessage = {
                    "action": "remove",
                    "state": "blocked",
                    "blockedByIds": msGraphResourceObject.configurationTypes
                };
            } else {
                // no reference, delete object
                MsGraphResource.deleteOne({ _id: objectId }, function (err) {
                    if (err) {
                        resultStatus = 500;
                        resultMessage = {
                            "action": "remove",
                            "state": "error",
                            "message": err
                        };
                    }
                });
            }
        } else {
            // object with provided id not found
            resultStatus = 400;
            resultMessage = {
                "action": "remove",
                "state": "notfound",
                "message": "object not found"
            };
            context.log("TRG4000MsGraphResourceDelete: object not found")
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