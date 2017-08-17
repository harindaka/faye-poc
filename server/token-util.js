module.exports = function(){
    var self = this;

    self.generateToken = function(tokenData){
        return new Promise((resolve, reject) => {
            try{
                resolve(tokenData + '-dummy-token');
            }catch(e){
                reject(e);
            }
        })
    }

    self.decrypt = function(token){
        return new Promise((resolve, reject) => {
            try{
                //Todo: check null and try decryption
                resolve(true);
            }catch(e){
                reject(e);
            }
        })
    }
}