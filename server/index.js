(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye.options);
    
    var DataStore = require('./data-store');
    var dataStore = new DataStore(config);

    var ErrorUtil = require('./error-util');
    var errorUtil = new ErrorUtil(config);

    var TokenUtil = require('./token-util');
    var tokenUtil = new TokenUtil(config);

    var ServersideClient = require('./serverside-client');
    var serversideClient = new ServersideClient(config, fayeServer, tokenUtil);

    var SessionManager = require('./session-manager');
    var sessionManager = new SessionManager(config, fayeServer, serversideClient, tokenUtil, errorUtil);

    var ChannelRequestParser = require('./channel-request-parser');
    var channelRequestParser = new ChannelRequestParser();

    var topicIndex = config.server.faye.topics;

    var SubscriptionInterceptor = require('./incoming-subscription-interceptor');
    var subscriptionInterceptor = new SubscriptionInterceptor(topicIndex, dataStore, tokenUtil, sessionManager, errorUtil);

    var IncomingMessageInterceptor = require('./incoming-message-interceptor');
    var incomingMessageInterceptor = new IncomingMessageInterceptor(topicIndex, sessionManager, errorUtil);

    var OutgoingMessageInterceptor = require('./outgoing-message-interceptor');
    var outgoingMessageInterceptor = new OutgoingMessageInterceptor();


    fayeServer.addExtension({
        incoming: function(message, callback) {         
            let parsedRequest = channelRequestParser.parseRequest(message);
            if(parsedRequest.requestType === 'subscription'){
                subscriptionInterceptor.processRequest(parsedRequest).then(() => {
                    callback(message);
                }).catch((error) => {
                    console.log('[' + parsedRequest.channel + '] Rejecting subscription due to error: ' + errorUtil.toMessage(error));
                    message.error = errorUtil.toJson(error);
                    callback(message);
                });
            }
            else if(parsedRequest.requestType === 'meta'){
                callback(message);
            }
            else{ //parsedRequest.requestType === 'message'
                incomingMessageInterceptor.processRequest(parsedRequest, message).then(() => {
                    callback(message);
                }).catch((error) => {
                    console.log('[' + parsedRequest.channel + '] Rejecting message due to error: ' + errorUtil.toMessage(error));
                    message.error = errorUtil.toJson(error);
                    callback(message);
                });
            }

            // if (message.channel === '/meta/subscribe') {
            //     var matches = message.subscription.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
            //     if(matches !== null && matches.length > 0){
            //         var incomingNickname = matches[1];
            //         console.log('[' + incomingNickname + '][' + message.subscription + '] Received subscription request'); 

            //         var newToken = null;
            //         dataStore.reserveNickname(incomingNickname).then((isSuccess) => {
            //             if(!isSuccess){
            //                 throw errorUtil.create('E409');
            //             }

            //             return tokenUtil.generateToken({ 
            //                 tokenType: "user-auth-token",
            //                 nickname: incomingNickname
            //             });
            //         }).then((token) => {
            //             newToken = token;
            //             return tokenUtil.decryptToken(token);
            //         }).then((tokenData) => {
            //             sessionManager.enqueueSessionExpiration(message.subscription, message.clientId, tokenData);
            //             return dataStore.updateAuthToken(incomingNickname, newToken);
            //         }).then(() => {
            //             callback(message);
            //         }).catch((error) => {
            //             console.log('[' + incomingNickname + '][' + message.subscription + '] Failed to subscribe user due to error: ' + errorUtil.toMessage(error));
            //             message.error = errorUtil.toJson(error);
            //             callback(message);
            //         });
            //     } 
            //     else if(config.server.faye.topics[message.subscription]){
            //         console.log('[' + message.subscription + '] Received subscription request');
            //         sessionManager.validateSession(message).then((tokenData) => {
            //             sessionManager.enqueueSessionExpiration(message.subscription, message.clientId, tokenData);
            //             callback(message);
            //         }).catch((error) => {
            //             console.log('[' + message.subscription + '] Subscription failed due to error: ' + errorUtil.toMessage(error));
            //             message.error = errorUtil.toJson(error);
            //             callback(message);
            //         });
            //     }  
            //     else {
            //         message.error = errorUtil.toJson(errorUtil.create('E404'));
            //         console.log('[' + message.subscription + '] Failed to subscribe to requested channel due to error: ' + errorUtil.toMessage(message.error));                     
            //         callback(message);
            //     }
            // } else if(message.channel.startsWith('/meta/')){
            //     callback(message);
            // } else if(message.channel === '/chat'){
            //     console.log('[' + message.channel + '] Received chat: ' + JSON.stringify(message));                                
            //     sessionManager.validateSession(message).then((tokenData) => {
            //         if(typeof tokenData.nickname !== 'undefined' && tokenData.nickname !== null){
            //             message.data.sender = tokenData.nickname;
            //         }

            //         callback(message);
            //     }).catch((error) => {
            //         console.log('[' + message.channel + '] Failed to validate session for incoming message due to error: ' + errorUtil.toMessage(error));
            //         message.error = errorUtil.toJson(error);
            //         callback(message);
            //     });
            // } else {                
            //     var matches = message.channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
            //     if(matches === null || matches.length <= 0){
            //         message.error = errorUtil.toJson(errorUtil.create('E404'));
            //         console.log('[' + message.subscription + '] Failed to publish to requested channel due to error: ' + errorUtil.toMessage(message.error));                                         
            //     } 

            //     callback(message);               
            // }
        },

        outgoing: function(message, callback){
            outgoingMessageInterceptor.processResponse(message).then(() => {
                callback(message);
            }).catch((error) => {
                console.log('[' + parsedRequest.channel + '] Failed to process outgoing message due to error: ' + errorUtil.toMessage(error));
                message.error = errorUtil.toJson(error);
                callback(message);
            });

            // if(message.advice && message.advice.reconnect === 'handshake'){
            //     message.advice.reconnect = 'none'
            // }
            // delete message.ext;
            // callback(message);
        }
    });

    fayeServer.on('subscribe', function(clientId, channel) { 
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
                console.log('[' + incomingNickname + '][' + channel + '] Failed to publish auth-token ' + JSON.stringify(tokenMessage) + ' due to error: ' + errorUtil.toMessage(error));                
            }).then(() => {
                return serversideClient.publish(chatChannel, userJoinMessage);
            }).then(() => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Published chat: ' + JSON.stringify(userJoinMessage));                
            }).catch((error) => {
                console.log('[' + incomingNickname + '][' + chatChannel + '] Failed to publish chat ' + JSON.stringify(userJoinMessage) + ' due to error: ' + errorUtil.toMessage(error));                
            });                   
        }               
    });

    fayeServer.on('unsubscribe', function(clientId, channel) {
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
                console.log('[' + incomingNickname + '][' + chatChannel + '] Failed to publish chat ' + JSON.stringify(userLeaveMessage) + ' due to error: ' + errorUtil.toMessage(error));                
            });                   
        }
    });

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, (error) => {
        if(error){
            console.log('Failed to initialize http server due to error: ' + errorUtil.toMessage(error));
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
            //         console.log('The server explicitly rejected publishing the message due to error: ' + errorUtil.toMessage(error));
            //     });
            // }, 3000);
        }
    });
})();