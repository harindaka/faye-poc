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
                chat: {
                    url: '/chat'
                },
                log: {
                    url: '/log'
                }
            }
        },
        security: {
            tokenSecret: "03f28a2d-e156-4169-a8f6-fb2beaeb6a4b",
            clientTokenExpiresIn: "30s",
            serverTokenExpiresIn: "10y",
            idleSubscriptionExpirationWindow: "10s"
        }
    },

    sessionStore: {
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