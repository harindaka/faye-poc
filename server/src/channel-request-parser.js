module.exports = function(){
    var self = this;

    self.parseRequest = function(message){
        let parsedRequest = {
            requestType: 'message',
            isOnUserChannel: false,
            clientId: message.clientId,
            channel: null,
            metaChannel: null,
            channelParams: {},
            authToken: null
        };

        if(message.ext && message.ext.authToken){
            parsedRequest.authToken = message.ext.authToken;
        }

        if (message.channel === '/meta/subscribe') {
            parsedRequest.requestType = 'subscription';            
            
            let nickname = self.parseNicknamefromUserChannelUrl(message.subscription);
            if(nickname !== null){
                parsedRequest.isOnUserChannel = true;
                parsedRequest.channelParams.nickname = nickname;                
            }

            parsedRequest.channel = message.subscription;
            parsedRequest.metaChannel = message.channel;
        } else if(message.channel.startsWith('/meta/')) {
            parsedRequest.requestType = 'meta';
            parsedRequest.metaChannel = message.channel;
        } else {             
            let nickname = self.parseNicknamefromUserChannelUrl(message.channel);
            if(nickname !== null){
                parsedRequest.isOnUserChannel = true;
                parsedRequest.channelParams.nickname = nickname;                
            }

            parsedRequest.channel = message.channel;
        }

        return parsedRequest;
    }

    self.parseNicknamefromUserChannelUrl = function(url){
        let matches = url.match(/^\/chat\/users\/([a-zA-Z0-9]{1,15})$/);
        if (matches !== null && matches.length > 0){
            return matches[1];
        }else {
            return null;
        }
    }
}