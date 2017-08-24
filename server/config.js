module.exports = {
    server: {
        port: 3000,
        faye: {
            options: {
                mount: '/messages',
                timeout: 30,
                engine: {
                    type: require('faye-redis'),
                    host: 'localhost',
                    port: 6379
                }
            },
            topics: {
                "/log": {
                    //topic server side configuration goes here
                },
                "/chat": {
                    //topic server side configuration goes here
                }
            }
        },
        security: {
            tokenSecret: "03f28a2d-e156-4169-a8f6-fb2beaeb6a4b",
            clientTokenExpiresIn: "1m",
            serverTokenExpiresIn: "10y",
            idleSubscriptionExpirationWindow: "0.5m"
        }
    },

    dataStore: {
        options: { 
            host: 'localhost', 
            port: 6379
        } 
    },
    
    errors: {
        E404: 'Topic not found',
        E401: 'Unauthorized',
        E409: 'Nickname already in use'
    }
}