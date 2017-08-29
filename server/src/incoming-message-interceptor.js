module.exports = function(
    topicIndex,
    sessionManager,
    errorUtil    
){
    var self = this;

    self.processRequest = function(request, message){
        try{            
            if(request.isOnUserChannel || topicIndex[request.channel]){
                return sessionManager.validateMessage(request.authToken).then((tokenData) => {                     
                    if(typeof tokenData.nickname !== 'undefined' && tokenData.nickname !== null){
                        console.log('[' + tokenData.nickname + '][' + request.channel + '] Received message: ' + JSON.stringify(message.data));
                        message.data.sender = tokenData.nickname;
                    }                
                    else{
                        console.log('[' + request.channel + '] Received message: ' + JSON.stringify(message.data));
                    }
                });
            } else {
                return Promise.reject(errorUtil.create('E404'));
            }   
        } catch(error){
            return Promise.reject(error);
        }     
    };
}