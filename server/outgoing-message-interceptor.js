module.exports = function(){
    var self = this;

    self.processResponse = function(message){
        return new Promise((resolve, reject) => {
            try{
                if(message.advice && message.advice.reconnect === 'handshake'){
                    message.advice.reconnect = 'none'
                }
                
                delete message.ext;

                resolve();
            } catch (error){
                reject(error);
            }
        });       
    };
}