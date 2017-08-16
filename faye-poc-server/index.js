(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye.options);
    var serverSideFayeClient = fayeServer.getClient();

    fayeServer.addExtension({
        incoming: function(message, callback) {
            if (message.channel === '/meta/subscribe') {                
                console.log('Intercepted subscription request: ' + JSON.stringify(message))
                
                var matches = message.subscription.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                if(matches !== null && matches.length > 0){
                    var incomingNickname = matches[1];
                    console.log('Received authentication request for ' + incomingNickname); 

                    //Todo: check uniqueness of nickname, generate token and store in redis
                    //Call callback asyncly
                }   
                else if(!config.server.faye.topics[message.subscription]){
                    message.error = buildError('E404'); 
                }
                
           } else if(message.channel === '/chat'){
                console.log('Intercepted chat: ' + JSON.stringify(message));                                
                // if(message.ext && message.ext.token){
                //     //Todo: validate token and set senderName field
                //     message.senderName = message.ext.token;
                // } else {
                //     message.error = buildError('E401')
                // }                           
            } else {                
                var matches = message.channel.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
                
                if(matches !== null && matches.length > 0 
                    && message.data.meta && message.data.meta.type
                    && message.data.meta.type === 'auth-token-request'){
                    
                    console.log('Intercepted auth-token-request: ' + JSON.stringify(message));
                    
                    var incomingNickname = matches[1];

                    //Todo: retrieve token from redis using the incomingNickname and set it in tokenMessage

                    var tokenMessage = { 
                        meta: {
                            type: 'auth-token'
                        }, 
                        token: "sample token for " + incomingNickname
                    };

                    serverSideFayeClient.publish(message.channel, tokenMessage, {
                        deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                        attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                    }).then(function(){
                        console.log('Published auth-token message ' + JSON.stringify(tokenMessage) + ' on channel ' + message.subscription);
                    }, function(error){
                        console.log('The server explicitly rejected publishing the auth-token message due to error: ' + error.message);
                    });
                }
            }
            
            callback(message);
        },

        outgoing: function(message, callback){
            delete message.ext;
            callback(message);
        }
    });

    fayeServer.attach(httpServer);
    httpServer.listen(config.server.port, function(error){
        if(error){
            console.log(error);
        }
        else{
            console.log('Listening on port ' + config.server.port);

            // var publishedMessageCount = 0;
            // setInterval(function(){          
            //     var topicUrl = '/mytopic';  
            //     serverSideFayeClient.publish(topicUrl, { 
            //         text: 'Hello!', 
            //         clientId: null,
            //         publishedMessageCount: publishedMessageCount
            //     }, {
            //         deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
            //         attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
            //     }).then(function(){
            //         publishedMessageCount += 1;                    
            //     }, function(error){
            //         console.log('The server explicitly rejected publishing the message due to error: ' + error.message);
            //     });
            // }, 3000);
        }
    });

    function buildError(errorCode){
        return '(' + errorCode + ') ' + config.errors[errorCode];        
    }
})();