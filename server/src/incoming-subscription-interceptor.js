module.exports = function(
    topicIndex,
    dataStore,
    tokenUtil,
    sessionManager,
    errorUtil    
){
    var self = this;

    self.processRequest = function(request){
        try{
            if(request.isOnUserChannel){
                console.log('[' + request.channelParams.nickname + '][' + request.channel + '] Received subscription request');
                
                let newToken = null;
                return dataStore.reserveNickname(request.channelParams.nickname).then((isSuccess) => {
                    if(!isSuccess){
                        throw errorUtil.create('E409');
                    }

                    return tokenUtil.generateToken({ 
                        tokenType: "user-auth-token",
                        nickname: request.channelParams.nickname
                    });
                }).then((token) => {
                    newToken = token;
                    return tokenUtil.decryptToken(token);
                }).then((tokenData) => {
                    sessionManager.enqueueSessionExpiration(request.channel, request.clientId, tokenData);
                    return dataStore.updateAuthToken(request.channelParams.nickname, newToken);
                });
            } else if(topicIndex[request.channel]){
                return sessionManager.validateSession(request.authToken).then((tokenData) => {                    
                    sessionManager.enqueueSessionExpiration(request.channel, request.clientId, tokenData);   
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