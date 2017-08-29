module.exports = function(
    topicIndex,
    sessionManager,
    errorUtil    
){
    var self = this;

    self.processRequest = function(request){
        try{
            if(request.isOnUserChannel){
                console.log('[' + request.channelParams.nickname + '][' + request.channel + '] Received subscription request');                
                return sessionManager.createSession(request);
            } else if(topicIndex[request.channel]){
                return sessionManager.validateSubscription(request).then((tokenData) => {
                    console.log('[' + tokenData.nickname + '][' + request.channel + '] Received subscription request');
                });
            } else {
                return Promise.reject(errorUtil.create('E404'));
            }
        } catch(error){
            return Promise.reject(error);
        }
    };
}