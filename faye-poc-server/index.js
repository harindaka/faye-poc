(function(){
    
    var config = require('./config');
    var http = require('http');
    var httpServer = http.createServer();

    var faye = require('faye');
    var fayeServer = new faye.NodeAdapter(config.server.faye.options);

    fayeServer.addExtension({
        incoming: function(message, callback) {
            if (message.channel === '/meta/subscribe') {                
                console.log('Received subscription request: ' + JSON.stringify(message))
                if(!config.server.faye.topics[message.subscription]){
                    message.error = buildError('E404'); 
                } else if (!isAuthorized(message)){
                    message.error = buildError('E401');
                }
           } else if(message.channel === '/chat'){
                console.log('Intercepted incoming message: ' + JSON.stringify(message));                                
                if(message.ext && message.ext.token){
                    //Todo: validate token and set senderName field
                    message.senderName = message.ext.token;
                } else {
                    message.error = buildError('E401')
                }                           
            } else{
                var matches = message.channel.match(/^\/chat\/users\/[a-zA-Z0-9]{1,15}$/g);
                if(matches !== null && matches.length === 1){
                    console.log('Intercepted incoming message: ' + JSON.stringify(message));                                
                    if(message.ext && message.ext && message.){
                        //Todo: validate token and set senderName field
                        message.senderName = message.ext.token;
                    } else {
                        message.error = buildError('E401')
                    } 
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

            var publishedMessageCount = 0;
            var serverSideFayeClient = fayeServer.getClient();
            setInterval(function(){          
                var topicUrl = '/mytopic';  
                serverSideFayeClient.publish(topicUrl, { 
                    text: 'Hello!', 
                    clientId: null,
                    publishedMessageCount: publishedMessageCount
                }, {
                    deadline: 10, //client will not attempt to resend the message any later than 10 seconds after your first publish() call
                    attempts: 3 //how many times the client will try to send a message before giving up, including the first attempt
                }).then(function(){
                    publishedMessageCount += 1;                    
                }, function(error){
                    console.log('The server explicitly rejected publishing the message due to error: ' + error.message);
                });
            }, 3000);
        }
    });

    function isAuthorized(message) {
        return true;
    };

    function buildError(errorCode){
        return '(' + errorCode + ') ' + config.errors[errorCode];        
    }
})();