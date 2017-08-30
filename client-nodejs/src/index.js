(function(){
    
    var faye = require('faye');    
    var fayeClient = new faye.Client('https://localhost:3030/messages', {
        timeout: 40,
        retry: 2 //the amount of time in seconds that the client will wait between detecting a failed delivery and retrying the message        
    });

    fayeClient.on('transport:down', function() {
        console.log('Oops this client seems to be offline');
    });

    fayeClient.on('transport:up', function() {
        console.log('This client is online');
    });

    var topicUrl = '/log';
    fayeClient.subscribe(topicUrl, function(message){
        if(message.clientId === null){
            console.log('Received: ' + message.text + ' from server (' + message.publishedMessageCount + ' messages published)');
        }
        else{
            console.log('Received: ' + message.text + ' from client ' + message.clientId + ' (' + message.publishedMessageCount + ' messages published)');
        }
    }).then(function(){
        var guid = require('guid');
        var clientId = guid.raw();
        
        console.log('Subscribed to ' + topicUrl + ' as client instance ' + clientId);
        console.log('Waiting for messages...');
        console.log('');
        
        var publishedMessageCount = 0;
        setInterval(function(){            
            fayeClient.publish(topicUrl, { 
                text: 'Hello!', 
                clientId: clientId,
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
    }, function(error){
        console.log('Unable to subscribe to topic ' + topicUrl + ' due to error ' + serializeError(error));
    });

    function serializeError(error){
        if(error.message && error.message.code && error.message.message){
            return error.message.code + ': ' + error.message.message
        }
        else {
            return JSON.stringify(error);
        }
    }
    
})();