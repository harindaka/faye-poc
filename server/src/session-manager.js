module.exports = function(
    config,
    sessionStore, 
    fayeServer, 
    serversideClient,
    channelRequestParser,
    messageFactory,
    tokenUtil,
    errorUtil
){
    var self = this;

    let ms = require('ms');

    self.createSession = function(request){
        let newToken = null;
        return sessionStore.reserveNickname(request.channelParams.nickname).then((isSuccess) => {
            if(!isSuccess){
                throw errorUtil.create('E409');
            }

            return tokenUtil.generateToken({
                nickname: request.channelParams.nickname,
                clientId: request.clientId
            });
        }).then((token) => {
            newToken = token;
            return tokenUtil.decryptToken(token);
        }).then((tokenData) => {
            let promise = sessionStore.updateToken(request.channelParams.nickname, request.clientId, newToken);
            enqueueSessionExpiration(request.channel, request.clientId, tokenData);                    
            return promise;
        });
    }

    self.validateSubscription = function(request){        
        return self.validateMessage(request.authToken).then((tokenData) => {
            enqueueSessionExpiration(request.channel, request.clientId, tokenData);   
            return Promise.resolve(tokenData);
        });              
    };

    self.validateMessage = function(authToken){        
        if(authToken){
            return tokenUtil.decryptToken(authToken);
        } else {
            return Promise.reject(errorUtil.create('E401'));                
        }                
    };

    function enqueueSessionExpiration(channel, clientId, tokenData){
        let d = new Date();
        let currentTimeInSeconds = Math.round(d.getTime() / 1000);
        let expirationInSeconds = tokenData.exp - currentTimeInSeconds;

        let nickname = channelRequestParser.parseNicknamefromUserChannelUrl(channel);
        if(nickname !== null){            
            setTimeout(function() {
                let sessionExpirationMessage = messageFactory.create('session-expiration');
                sessionExpirationMessage.clientId = tokenData.clientId;
                serversideClient.publish(channel, sessionExpirationMessage).then(() => {
                    console.log('[#SERVER][@' + nickname + '][' + channel + '] Published session-expiration');
                }).catch((error) => {
                    console.log('[!!!ERROR][$' + nickname + '][' + channel + '] Failed to publish session-expiration due to error: ' + error.message);                
                }).then(() => {
                    setTimeout(function() {
                        disconnectClient(channel, clientId, nickname);
                    }, ms(config.server.security.idleSubscriptionExpirationWindow));
                });            
            }, expirationInSeconds * 1000);
        }
        else{
            setTimeout(function() {                
                disconnectClient(channel, clientId);                
            }, (expirationInSeconds * 1000) + ms(config.server.security.idleSubscriptionExpirationWindow));
        }
    };

    function disconnectClient(channel, clientId, nickname){
        if(typeof nickname === 'undefined' || nickname === null){
            nickname = '';
        }
        else{
            nickname = '[$' + nickname + ']';
        }

        let metaDisconnectChannel = '/meta/disconnect';
        let disconnectClientMessage = messageFactory.createMeta(metaDisconnectChannel, clientId);
        serversideClient.publish(metaDisconnectChannel, disconnectClientMessage).then(() => {
            console.log('[#SERVER]' + nickname + '[' + channel + '] Published client disconnection');
        }).catch((error) => {
            console.log('[!!!ERROR]' + nickname + '[' + channel + '] Failed to publish client disconnection due to error: ' + error.message);                
        });

        //fayeServer._server._engine.destroyClient(clientId, function() {});
    }
}