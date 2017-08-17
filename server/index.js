(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye.options);
    var serverSideFayeClient = fayeServer.getClient();

    var DataStore = require('./data-store');
    var dataStore = new DataStore(config);

    var TokenUtil = require('./token-util');
    var tokenUtil = new TokenUtil();

    fayeServer.addExtension({
        incoming: function(message, callback) {
            if (message.channel === '/meta/subscribe') {
                var matches = message.subscription.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches !== null && matches.length > 0){
                    var incomingNickname = matches[1];
                    console.log('[' + incomingNickname + '][' + message.subscription + '] Received subscription request'); 

                    dataStore.reserveNickname(incomingNickname).then((isSuccess) => {
                        if(!isSuccess){
                            throw buildError('E409');
                        }

                        return tokenUtil.generateToken(incomingNickname);
                    }).then((token) => {
                        return dataStore.updateAuthToken(incomingNickname, token);
                    }).then(() => {
                        callback(message);
                    }, (error) => {
                        console.log('[' + incomingNickname + '][' + message.subscription + '] Failed to subscribe user due to error: ' + error.message);
                        message.error = error.message;
                        callback(message);
                    });
                } 
                else if(config.server.faye.topics[message.subscription]){
                    //Todo: validate token get incomingNickname from token and format log entry
                    console.log('[' + message.subscription + '] Received subscription request');                     
                    callback(message);
                }  
                else {
                    message.error = buildError('E404').message;
                    console.log('[' + message.subscription + '] Failed to subscribe to requested channel due to error: ' + message.error);                     
                    callback(message);
                }
            } else if(message.channel.startsWith('/meta/')){
                callback(message);
            } else if(message.channel === '/chat'){

                //Todo: Format log message with incomingNickname
                console.log('[' + message.channel + '] Received chat: ' + JSON.stringify(message));                                

                var incomingAuthToken = null;
                if(message.meta){
                    incomingAuthToken = message.meta.authToken;
                }
                
                tokenUtil.decrypt(incomingAuthToken).then((tokenData) => {
                    if(tokenData === null){
                        //Todo: Format log message with incomingNickname
                        console.log('[' + message.channel + '] Received invalid token: ' + message.meta.authToken);
                        throw buildError('E401');
                    }
                    else if(tokenData.expiration <= new Date()){
                        //Todo: Format log message with incomingNickname
                        console.log('[' + message.channel + '] Received expired token: ' + message.meta.authToken);
                        throw buildError('E401');
                    }

                    callback(message);
                }, (error) => {
                    message.error = error.message;
                    callback(message);
                });                                          
            
            } else {                
                var matches = message.channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches === null || matches.length <= 0){
                    message.error = buildError('E404').message;
                    console.log('[' + message.subscription + '] Failed to publish to requested channel due to error: ' + message.error);                                         
                } 

                callback(message);               
            }
        },

        outgoing: function(message, callback){
            delete message.ext;
            callback(message);
        }
    });

    fayeServer.on('subscribe', function(message, channel) {
        if(channel === '/chat'){
            //Todo: implement user Join Message             
        }else {
            var matches = channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
            if(matches !== null && matches.length > 0){                        
                var incomingNickname = matches[1];
                
                var tokenMessage = { 
                    meta: {
                        type: 'auth-token'
                    }, 
                    authToken: ''
                };

                dataStore.getAuthToken(incomingNickname).then((authToken) => {
                    tokenMessage.authToken = authToken;                    

                    return serverSideFayeClient.publish(channel, tokenMessage, {
                        deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                        attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                    });
                }).then(() => {
                    console.log('[' + incomingNickname + '][' + channel + '] Published auth-token: ' + JSON.stringify(tokenMessage));                
                }, (error) => {
                    console.log('[' + incomingNickname + '][' + channel + '] Failed to publish auth-token ' + JSON.stringify(tokenMessage) + ' due to error: ' + error.message);                
                });                   
            }
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

            dataStore.removeNickname(incomingNickname).then(() => {
                return serverSideFayeClient.publish(channel, userLeaveMessage, {
                    deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                    attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                });
            }).then(() => {
                console.log('[' + incomingNickname + '][' + channel + '] Published chat: ' + JSON.stringify(userLeaveMessage));
            }, (error) => {
                console.log('[' + incomingNickname + '][' + channel + '] Failed to publish chat ' + JSON.stringify(userLeaveMessage) + ' due to error: ' + error.message);                
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
            //     serverSideFayeClient.publish(topicUrl, { 
            //         text: 'Hello!', 
            //         clientId: null,
            //         publishedMessageCount: publishedMessageCount
            //     }, {
            //         deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
            //         attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
            //     }).then(() => {
            //         publishedMessageCount += 1;                    
            //     }, (error) => {
            //         console.log('The server explicitly rejected publishing the message due to error: ' + error.message);
            //     });
            // }, 3000);
        }
    });

    function buildError(errorCode){
        return new Error('(' + errorCode + ') ' + config.errors[errorCode]);        
    }
})();