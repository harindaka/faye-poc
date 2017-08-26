module.exports = function(
    topicIndex,
    sessionManager,
    errorUtil    
){
    var self = this;

    self.processRequest = function(request, message){
        try{
            console.log('[' + request.channelParams.nickname + '][' + request.channel + '] Received message: ' + JSON.stringify(message)); 

            if(request.isOnUserChannel || topicIndex[request.channel]){
                return sessionManager.validateSession(request.authToken).then((tokenData) => {
                    if(typeof tokenData.nickname !== 'undefined' && tokenData.nickname !== null){
                        message.data.sender = tokenData.nickname;
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