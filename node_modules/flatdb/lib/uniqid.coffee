crypto = require 'crypto'

class uniqid
    constructor: (@salt = '') ->

    gen: (len = 100) ->
        key = ''
        str = '1234567890abcdefghijlmnopqrstuyxzw'.split ''

        while key.length < len
            rnd = Math.floor Math.random() * str.length
            key = key + str[rnd]
            
        crypto.createHash('sha1').update(@salt + key + new Date().getTime()).digest 'hex'

module.exports = uniqid
