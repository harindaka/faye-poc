module.exports = function(
    config, 
    fayeServer, 
    serversideClient,
    tokenUtil,
    errorUtil
){
    var self = this;

    var ms = require('ms');

    self.validateSession = function(authToken){        
        if(authToken){
            return tokenUtil.decryptToken(authToken);
        } else {
            return Promise.reject(errorUtil.create('E401'));                
        }                
    };

    self.enqueueSessionExpiration = function(channel, clientId, tokenData){
        var d = new Date();
        var currentTimeInSeconds = Math.round(d.getTime() / 1000);
        var expirationInSeconds = tokenData.exp - currentTimeInSeconds;

        var matches = channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
        if(matches !== null && matches.length > 0){
            var nickname = matches[1];
            
            setTimeout(function() {
                var sessionExpirationMessage = { meta: { type: 'session-expiration' } };
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
            }, expirationInSeconds * 1000);
        }
    };

    function destroyClient(clientId){
        fayeServer._server._engine.destroyClient(clientId, function() {});
    }
}