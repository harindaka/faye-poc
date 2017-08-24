module.exports = function(config){
    var self = this;

    self.create = function(errorCode){
        var error = new Error('(' + errorCode + ') ' + config.errors[errorCode]);
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
}