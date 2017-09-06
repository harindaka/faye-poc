module.exports = function(){
    var self = this;

    self.create = function(messageType, clientId){
        let message = {
            meta: { type: messageType }
        };

        if(clientId){
            message.meta.clientId = clientId;
        }

        return message;
    }

    self.createMeta = function(channel, clientId){
        let message = {
            channel: channel
        };

        if(clientId){
            message.clientId = clientId;
        }

        return message;
    }
}