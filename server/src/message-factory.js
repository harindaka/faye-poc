module.exports = function(){
    var self = this;

    self.create = function(messageType){
        return {
            meta: { type: messageType }
        }
    }
}