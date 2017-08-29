module.exports = function(
    config, 
    fayeServer, 
    serversideClient,
    channelRequestParser,
    messageFactory,
    tokenUtil,
    errorUtil
){
    var self = this;

    let ms = require('ms');

    self.validateSession = function(authToken){        
        if(authToken){
            return tokenUtil.decryptToken(authToken);
        } else {
            return Promise.reject(errorUtil.create('E401'));                
        }                
    };

    self.enqueueSessionExpiration = function(channel, clientId, tokenData){
        let d = new Date();
        let currentTimeInSeconds = Math.round(d.getTime() / 1000);
        let expirationInSeconds = tokenData.exp - currentTimeInSeconds;

        let nickname = channelRequestParser.parseNicknamefromUserChannelUrl(channel);
        if(nickname !== null){            
            setTimeout(function() {
                let sessionExpirationMessage = messageFactory.create('session-expiration');
                serversideClient.publish(channel, sessionExpirationMessage).then(() => {
                    console.log('[' + nickname + '][' + channel + '] Published session-expiration');
                }).catch((error) => {
                    console.log('[' + nickname + '][' + channel + '] Failed to publish session-expiration due to error: ' + error.message);                
                }).then(() => {
                    setTimeout(function() {
                        destroyClient(clientId);
                    }, ms(config.server.security.idleSubscriptionExpirationWindow));
                });            
            }, expirationInSeconds * 1000);
        }
        else{
            setTimeout(function() {                
                destroyClient(clientId);                
            }, (expirationInSeconds * 1000) + ms(config.server.security.idleSubscriptionExpirationWindow));
        }
    };

    function destroyClient(clientId){
        fayeServer._server._engine.destroyClient(clientId, function() {});
    }
}