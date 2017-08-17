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
                console.log('Intercepted subscription request: ' + JSON.stringify(message))
                
                var matches = message.subscription.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches !== null && matches.length > 0){
                    var incomingNickname = matches[1];
                    console.log('Received authentication request for ' + incomingNickname); 

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
                        message.error = error.message;
                        callback(message);
                    });
                }   
                else if(!config.server.faye.topics[message.subscription]){
                    message.error = buildError('E404').message; 
                    callback(message);
                }
                
           } else if(message.channel === '/chat'){
                console.log('Intercepted chat: ' + JSON.stringify(message));                                

                var incomingAuthToken = null;
                if(message.meta){
                    incomingAuthToken = message.meta.authToken;
                }
                
                tokenUtil.decrypt(incomingAuthToken).then((tokenData) => {
                    if(tokenData === null){
                        console.log('Received invalid token: ' + message.meta.authToken);
                        throw buildError('E401');
                    }
                    else if(tokenData.expiration <= new Date()){
                        console.log('Received expired token: ' + message.meta.authToken);
                        throw buildError('E401');
                    }

                    callback(message);
                }, (error) => {
                    message.error = error.message;
                    callback(message);
                });                                          
            } else {                
                var matches = message.channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                
                if(matches !== null && matches.length > 0 
                    && message.data.meta && message.data.meta.type
                    && message.data.meta.type === 'auth-token-request'){
                    
                    console.log('Intercepted auth-token-request: ' + JSON.stringify(message));
                    
                    var incomingNickname = matches[1];

                    var tokenMessage = { 
                        meta: {
                            type: 'auth-token'
                        }, 
                        authToken: ''
                    };

                    dataStore.getAuthToken(incomingNickname).then((authToken) => {
                        tokenMessage.authToken = authToken;                    

                        return serverSideFayeClient.publish(message.channel, tokenMessage, {
                            deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                            attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                        });
                    }).then(() => {
                        console.log('Published auth-token message ' + JSON.stringify(tokenMessage) + ' on channel ' + message.channel);
                    }, (error) => {
                        console.log('Server error occurred: ' + error.message);
                        message.error = error.message; 
                        callback(message);
                    });                   
                }
                else{
                    callback(message);
                }
            }
        },

        outgoing: function(message, callback){
            delete message.ext;
            callback(message);
        }
    });

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, (error) => {
        if(error){
            console.log(error);
        }
        else{
            console.log('Listening on port ' + config.server.port);

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