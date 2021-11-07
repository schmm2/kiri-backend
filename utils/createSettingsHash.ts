const cryptoModule = require('crypto')

const createSettingsHash = (dataObjectOriginal) => {
    // create data copy
    let dataObject = {...dataObjectOriginal};
    
    // modify data, otherwise it will be rejected by graph api
    // generic changes applied to all objects
    delete dataObject.version 
    delete dataObject.id 
    delete dataObject.lastModifiedDateTime
    delete dataObject.createdDateTime
    delete dataObject.supportsScopeTags
    delete dataObject.roleScopeTagIds
    delete dataObject["@odata.context"]

    let dataObjectJSON = JSON.stringify(dataObject);
    let settingsHash = cryptoModule.createHash('md5').update(dataObjectJSON).digest("hex");

    return settingsHash;
};
export {createSettingsHash}