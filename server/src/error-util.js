module.exports = function(config){
    var self = this;

    self.create = function(errorCode){
        let error = new Error('(' + errorCode + ') ' + config.errors[errorCode]);
        error.name = errorCode;
        
        return error;        
    };

    self.toJson = function(error){
        return { 
            name: error.name, 
            message: error.message,
            stack: error.stack
        };
    };

    self.toMessage = function(error){
        if(typeof error === "string"){
            return error;
        }
        else if (typeof error === "object" && error.message) {
            if(typeof error.message === "string"){
                return error.message;
            }
            else if(typeof error.message === "object" && error.message.message){
                return error.message.message;
            }      
        }
        
        return JSON.stringify(error);    
    };
}