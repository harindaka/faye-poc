module.exports = function(
    config, 
    fayeServer, 
    serversideClient,
    tokenUtil,
    errorUtil
){
    var self = this;

    var ms = require('ms');

    self.validateSession = function(message, channel, clientId){
        if(message.ext && message.ext.authToken && message.ext.authToken !== null){
            return tokenUtil.decrypt(message.ext.authToken).then((tokenData) => {
                if(tokenData === null){         
                    throw errorUtil.create('E401');
                }

                return Promise.create(null);
            }).catch((error) => {
                console.log('[' + message.channel + '] Received invalid auth token ' + message.ext.authToken + ' in the incoming message: ' + JSON.stringify(message));
                fayeServer._server._engine.destroyClient(message.clientId, function() {});
                
                return Promise.create(errorUtil.toJson(error));                
            });
        } else {
            console.log('[' + message.channel + '] No auth token present in the incoming message: ' + JSON.stringify(message));
            fayeServer._server._engine.destroyClient(message.clientId, function() {});

            return Promise.create(errorUtil.create(errorUtil.toJson('E401')));
        }
    };

    self.enqueueExpiration = function(nickname, clientId){
        setTimeout(function() {
            var sessionExpirationMessage = { meta: { type: 'session-expiration' } };
            var channel = '/chat/users/' + nickname;
            serversideClient.publish(channel, sessionExpirationMessage).then(() => {
                console.log('[' + nickname + '][' + channel + '] Published session-expiration');
            }).catch((error) => {
                console.log('[' + nickname + '][' + channel + '] Failed to publish session-expiration due to error: ' + error.message);                
            }).then(() => {
                setTimeout(function() {
                    fayeServer._server._engine.destroyClient(clientId, function() {});
                }, ms(config.server.faye.security.idleSubscriptionExpirationWindow));
            });            
        }, ms(config.server.faye.security.clientTokenExpiresIn));
    };
}