(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye.options);
    
    var DataStore = require('./data-store');
    var dataStore = new DataStore(config);

    var TokenUtil = require('./token-util');
    var tokenUtil = new TokenUtil(config);

    var ServersideClient = require('./serverside-client');
    var serversideClient = new ServersideClient(config, fayeServer, tokenUtil);

    fayeServer.addExtension({
        incoming: function(message, callback) {
            console.log('Incoming:' + JSON.stringify(message));
            
            if (message.channel === '/meta/subscribe') {
                var matches = message.subscription.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches !== null && matches.length > 0){
                    var incomingNickname = matches[1];
                    console.log('[' + incomingNickname + '][' + message.subscription + '] Received subscription request'); 

                    dataStore.reserveNickname(incomingNickname).then((isSuccess) => {
                        if(!isSuccess){
                            throw buildError('E409');
                        }

                        return tokenUtil.generateToken({ 
                            tokenType: "user-auth-token",
                            nickname: incomingNickname
                        });
                    }).then((token) => {
                        return dataStore.updateAuthToken(incomingNickname, token);
                    }).then(() => {
                        callback(message);
                    }).catch((error) => {
                        console.log('[' + incomingNickname + '][' + message.subscription + '] Failed to subscribe user due to error: ' + error.message);
                        message.error = errorToJson(error);
                        callback(message);
                    });
                } 
                else if(config.server.faye.topics[message.subscription]){
                    //Todo: validate token get incomingNickname from token and format log entry
                    console.log('[' + message.subscription + '] Received subscription request');                     
                    callback(message);
                }  
                else {
                    message.error = errorToJson(buildError('E404'));
                    console.log('[' + message.subscription + '] Failed to subscribe to requested channel due to error: ' + message.error);                     
                    callback(message);
                }
            } else if(message.channel.startsWith('/meta/')){
                callback(message);
            } else if(message.channel === '/chat'){

                //Todo: Format log message with incomingNickname
                console.log('[' + message.channel + '] Received chat: ' + JSON.stringify(message));                                
                
                if(message.ext && message.ext.authToken && message.ext.authToken !== null){
                    tokenUtil.decrypt(message.ext.authToken).then((tokenData) => {
                        if(tokenData === null){                            
                            console.log('[' + message.channel + '] Received invalid/expired auth token ' + message.ext.authToken + ' in the incoming message: ' + JSON.stringify(message));                            
                            throw buildError('E401');
                        }

                        callback(message);
                    }).catch((error) => {
                        message.error = errorToJson(error);
                        callback(message);

                        fayeServer._server._engine.destroyClient(message.clientId, function() {});
                    });
                } else {
                    console.log('[' + message.channel + '] No auth token present in the incoming message: ' + JSON.stringify(message));
                    message.error = errorToJson(buildError('E401'));
                    callback(message);

                    fayeServer._server._engine.destroyClient(message.clientId, function() {});
                }                                          
            
            } else {                
                var matches = message.channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches === null || matches.length <= 0){
                    message.error = errorToJson(buildError('E404'));
                    console.log('[' + message.subscription + '] Failed to publish to requested channel due to error: ' + message.error);                                         
                } 

                callback(message);               
            }
        },

        outgoing: function(message, callback){
            if(message.advice && message.advice.reconnect === 'handshake'){
                message.advice.reconnect = 'none'
            }
            delete message.ext;
            callback(message);
        }
    });

    fayeServer.on('subscribe', function(message, channel) {        
        var matches = channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
        if(matches !== null && matches.length > 0){                        
            var incomingNickname = matches[1];
            
            var tokenMessage = { 
                meta: {
                    type: 'auth-token'
                }, 
                authToken: ''
            };

            var userJoinMessage = { 
                meta: {
                    type: 'chat'
                }, 
                text: incomingNickname + ' joined the chat'
            };

            var chatChannel = '/chat';
            dataStore.getAuthToken(incomingNickname).then((authToken) => {
                tokenMessage.authToken = authToken;                    

                return serversideClient.publish(channel, tokenMessage);
            }).then(() => {
                console.log('[' + incomingNickname + '][' + channel + '] Published auth-token: ' + JSON.stringify(tokenMessage));                
            }).catch((error) => {
                console.log('[' + incomingNickname + '][' + channel + '] Failed to publish auth-token ' + JSON.stringify(tokenMessage) + ' due to error: ' + error.message);                
            }).then(() => {
                return serversideClient.publish(chatChannel, userJoinMessage);
            }).then(() => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Published chat: ' + JSON.stringify(tokenMessage));                
            }).catch((error) => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Failed to publish chat ' + JSON.stringify(tokenMessage) + ' due to error: ' + error.message);                
            });                   
        }        
    });

    fayeServer.on('unsubscribe', function(message, channel) {
        var matches = channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);                
        if(matches !== null && matches.length > 0){                        
            var incomingNickname = matches[1];
            var userLeaveMessage = { 
                meta: {
                    type: 'chat'
                }, 
                text: incomingNickname + ' left the chat'
            };

            var chatChannel = '/chat';
            dataStore.removeNickname(incomingNickname).then(() => {
                return serversideClient.publish(chatChannel, userLeaveMessage);
            }).then(() => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Published chat: ' + JSON.stringify(userLeaveMessage));
            }).catch((error) => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Failed to publish chat ' + JSON.stringify(userLeaveMessage) + ' due to error: ' + error.message);                
            });                   
        }
    });

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, (error) => {
        if(error){
            console.log('Failed to initialize http server due to error: ' + error.message);
        }
        else{
            console.log('Successfully initialized server on port ' + config.server.port);

            // var publishedMessageCount = 0;
            // setInterval(() => {          
            //     var topicUrl = '/log';  
            //     serversideClient.publish(topicUrl, { 
            //         text: 'Hello!', 
            //         clientId: null,
            //         publishedMessageCount: publishedMessageCount
            //     }, {
            //         deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
            //         attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
            //     }).then(() => {
            //         publishedMessageCount += 1;                    
            //     }).catch((error) => {
            //         console.log('The server explicitly rejected publishing the message due to error: ' + error.message);
            //     });
            // }, 3000);
        }
    });

    function buildError(errorCode){
        var error = new Error('(' + errorCode + ') ' + config.errors[errorCode]);
        error.name = errorCode;
        
        return error;        
    }

    function errorToJson(error){
        return { 
            name: error.name, 
            message: error.message,
            stack: error.stack
        };
    }
})();